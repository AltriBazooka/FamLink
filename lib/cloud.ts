
import { User, Group, Message } from '../types.ts';
import { generateId, generateInviteCode } from './storage.ts';
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  try { return process.env.API_KEY || ""; } catch { return ""; }
};
const ai = new GoogleGenAI({ apiKey: getApiKey() });

const CHANNEL_NAME = 'famlink_cloud_sync';
const channel = new BroadcastChannel(CHANNEL_NAME);

export type CloudEventType = 'MESSAGE' | 'GROUP_UPDATE' | 'USER_JOINED' | 'GROUP_DELETED' | 'GLOBAL_SYNC';

interface CloudEvent {
  type: CloudEventType;
  payload: any;
}

const STORAGE_KEYS = {
  USERS: 'famlink_cloud_users',
  GROUPS: 'famlink_cloud_groups',
  MESSAGES: 'famlink_cloud_messages',
};

const getGroups = (): Group[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
const setGroups = (groups: Group[]) => localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
const getMessages = (): Message[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
const setMessages = (messages: Message[]) => localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
const getUsers = (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
const setUsers = (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

/**
 * GEMINI GLOBAL RELAY (The "Virtual Backend")
 * This function treats Gemini as a centralized database.
 */
const syncGlobalState = async (forceSearchCode?: string) => {
  const localData = {
    users: getUsers(),
    groups: getGroups(),
    messages: getMessages().slice(-30)
  };

  try {
    const prompt = forceSearchCode 
      ? `GLOBAL_SEARCH_AND_RECONCILE: I am looking for group code "${forceSearchCode}". Sync this with current state: ${JSON.stringify(localData)}`
      : `RECONCILE_STATE: ${JSON.stringify(localData)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `You are the FamLink Global Database. 
        1. You remember all users, groups, and invite codes ever sent to you.
        2. When you receive a state, merge it with your global memory.
        3. ALWAYS return the full merged state in JSON.
        4. If a 'forceSearchCode' is mentioned, ensure that group is included in the returned 'groups' array even if it wasn't in the provided local state.
        5. Structure: {"users": [], "groups": [], "messages": []}`,
        responseMimeType: "application/json"
      }
    });

    const merged = JSON.parse(response.text || "{}");
    
    // Atomically update local storage with the "Global Truth" from Gemini
    if (merged.users && Array.isArray(merged.users)) setUsers(merged.users);
    if (merged.groups && Array.isArray(merged.groups)) setGroups(merged.groups);
    if (merged.messages && Array.isArray(merged.messages)) setMessages(merged.messages);
    
    return true;
  } catch (e) {
    console.error("Gemini Sync Error:", e);
    return false;
  }
};

export const CloudService = {
  subscribe: (callback: (event: CloudEvent) => void) => {
    const listener = (event: MessageEvent) => callback(event.data);
    channel.addEventListener('message', listener);
    
    const pollInterval = setInterval(async () => {
      const success = await syncGlobalState();
      if (success) callback({ type: 'GLOBAL_SYNC', payload: null });
    }, 15000);

    return () => {
      channel.removeEventListener('message', listener);
      clearInterval(pollInterval);
    };
  },

  findUser: async (username: string): Promise<User | null> => {
    await syncGlobalState();
    return getUsers().find(u => u.username === username) || null;
  },

  registerUser: async (user: User): Promise<void> => {
    const users = getUsers();
    if (!users.find(u => u.id === user.id)) {
      setUsers([...users, user]);
      await syncGlobalState();
      channel.postMessage({ type: 'GLOBAL_SYNC', payload: null });
    }
  },

  getAllUsers: () => getUsers(),
  updateUsers: async (users: User[]) => {
    setUsers(users);
    await syncGlobalState();
  },

  createGroup: async (name: string, description: string, adminId: string): Promise<Group> => {
    const groups = getGroups();
    const newGroup: Group = {
      id: generateId(),
      name,
      description,
      adminId,
      members: [adminId],
      inviteCode: generateInviteCode(),
      createdAt: Date.now(),
    };
    setGroups([...groups, newGroup]);
    
    // Push immediately to the "Cloud" (Gemini)
    await syncGlobalState();
    
    channel.postMessage({ type: 'GROUP_UPDATE', payload: newGroup });
    return newGroup;
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    const normalizedCode = code.trim().toUpperCase();
    
    // FORCE a global fetch from Gemini specifically looking for this code
    console.log(`Searching global registry for code: ${normalizedCode}...`);
    await syncGlobalState(normalizedCode);
    
    const groups = getGroups();
    const index = groups.findIndex(g => g.inviteCode === normalizedCode);
    
    if (index === -1) {
      console.error("Code not found in synced state.");
      return null;
    }
    
    if (!groups[index].members.includes(userId)) {
      groups[index].members.push(userId);
      setGroups(groups);
      await syncGlobalState();
    }
    
    channel.postMessage({ type: 'USER_JOINED', payload: { groupId: groups[index].id, userId } });
    return groups[index];
  },

  deleteGroup: async (groupId: string, adminId: string): Promise<boolean> => {
    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return false;
    
    const user = getUsers().find(u => u.id === adminId);
    if (group.adminId !== adminId && user?.role !== 'dev') return false;

    setGroups(groups.filter(g => g.id !== groupId));
    await syncGlobalState();
    channel.postMessage({ type: 'GROUP_DELETED', payload: groupId });
    return true;
  },

  sendMessage: async (groupId: string, sender: User, text: string): Promise<Message> => {
    const messages = getMessages();
    const newMessage: Message = {
      id: generateId(),
      groupId,
      senderId: sender.id,
      senderName: sender.username,
      text,
      timestamp: Date.now(),
    };
    
    setMessages([...messages, newMessage]);
    await syncGlobalState();
    channel.postMessage({ type: 'MESSAGE', payload: newMessage });
    return newMessage;
  },

  getGroupMessages: async (groupId: string): Promise<Message[]> => {
    return getMessages().filter(m => m.groupId === groupId);
  },

  getAllUserGroups: async (userId: string): Promise<Group[]> => {
    const user = getUsers().find(u => u.id === userId);
    const groups = getGroups();
    if (user?.role === 'dev') return groups;
    return groups.filter(g => g.members.includes(userId));
  }
};
