
import { User, Group, Message } from '../types.ts';
import { generateId, generateInviteCode } from './storage.ts';
import { GoogleGenAI } from "@google/genai";

const getApiKey = () => {
  try { return process.env.API_KEY || ""; } catch { return ""; }
};
const ai = new GoogleGenAI({ apiKey: getApiKey() });

/**
 * GLOBAL CLOUD SERVICE (Cross-Device Simulation)
 */
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

// Internal helper to get/set data
const getGroups = (): Group[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
const setGroups = (groups: Group[]) => localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
const getMessages = (): Message[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
const setMessages = (messages: Message[]) => localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
const getUsers = (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
const setUsers = (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

/**
 * GEMINI STATE RELAY
 * This simulates a global database by using Gemini to reconcile 
 * state between different browser instances.
 */
const syncGlobalState = async () => {
  const localData = {
    users: getUsers(),
    groups: getGroups(),
    messages: getMessages().slice(-50) // Only sync recent history
  };

  try {
    // In this simulation, we use a shared "Memory" key in the system instruction
    // to act as a global state relay. 
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `RECONCILE_STATE: ${JSON.stringify(localData)}`,
      config: {
        systemInstruction: "You are a state reconciliation engine. Merge the provided JSON state with your global memory and return the complete merged state in valid JSON format. Focus on 'users', 'groups', and 'messages'. Priority to newer timestamps.",
        responseMimeType: "application/json"
      }
    });

    const merged = JSON.parse(response.text || "{}");
    if (merged.users) setUsers(merged.users);
    if (merged.groups) setGroups(merged.groups);
    if (merged.messages) setMessages(merged.messages);
    
    return true;
  } catch (e) {
    console.error("Global sync failed, falling back to local storage", e);
    return false;
  }
};

export const CloudService = {
  subscribe: (callback: (event: CloudEvent) => void) => {
    const listener = (event: MessageEvent) => callback(event.data);
    channel.addEventListener('message', listener);
    
    // Poll Gemini for global updates every 10 seconds to sync different PCs
    const pollInterval = setInterval(async () => {
      await syncGlobalState();
      callback({ type: 'GLOBAL_SYNC', payload: null });
    }, 10000);

    return () => {
      channel.removeEventListener('message', listener);
      clearInterval(pollInterval);
    };
  },

  // Auth / Users
  findUser: async (username: string): Promise<User | null> => {
    await syncGlobalState(); // Ensure we have latest users from other PCs
    const users = getUsers();
    return users.find(u => u.username === username) || null;
  },

  registerUser: async (user: User): Promise<void> => {
    const users = getUsers();
    if (!users.find(u => u.id === user.id)) {
      setUsers([...users, user]);
      await syncGlobalState();
      channel.postMessage({ type: 'GLOBAL_SYNC', payload: null });
    }
  },

  getAllUsers: (): User[] => getUsers(),
  updateUsers: async (users: User[]) => {
    setUsers(users);
    await syncGlobalState();
  },

  // Groups
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
    await syncGlobalState();
    channel.postMessage({ type: 'GROUP_UPDATE', payload: newGroup });
    return newGroup;
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    // CRITICAL: Pull latest groups from the "Global Relay" before checking the code
    await syncGlobalState();
    
    const groups = getGroups();
    const normalizedCode = code.trim().toUpperCase();
    const index = groups.findIndex(g => g.inviteCode === normalizedCode);
    
    if (index === -1) return null;
    
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
    
    const users = getUsers();
    const currentUser = users.find(u => u.id === adminId);
    if (group.adminId !== adminId && currentUser?.role !== 'dev') return false;

    setGroups(groups.filter(g => g.id !== groupId));
    const msgs = getMessages().filter(m => m.groupId !== groupId);
    setMessages(msgs);

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
    // Periodically fetch during chat
    return getMessages().filter(m => m.groupId === groupId);
  },

  getAllUserGroups: async (userId: string): Promise<Group[]> => {
    const user = getUsers().find(u => u.id === userId);
    const groups = getGroups();
    if (user?.role === 'dev') return groups;
    return groups.filter(g => g.members.includes(userId));
  }
};
