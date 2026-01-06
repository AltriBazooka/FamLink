
import { User, Group, Message } from '../types.ts';
import { generateId, generateInviteCode } from './storage.ts';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
 * DEEP GLOBAL SYNC
 * This is the bridge between different physical PCs.
 * It forces Gemini to reconcile local data with its "Global Memory".
 */
const syncGlobalState = async (forceSearchType?: 'USER' | 'CODE', searchTerm?: string) => {
  const localData = {
    users: getUsers(),
    groups: getGroups(),
    messages: getMessages().slice(-20)
  };

  try {
    const searchContext = forceSearchType && searchTerm 
      ? `FORCE_SEARCH: Looking for ${forceSearchType} "${searchTerm}".`
      : '';

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `GLOBAL_SYNC_REQUEST: ${searchContext} \nLOCAL_STATE: ${JSON.stringify(localData)}`,
      config: {
        systemInstruction: `You are the FamLink Global Master Database. 
        - You act as the central server for strangers on different PCs.
        - Your memory contains ALL users, groups, and messages ever synced with you.
        - Merge the incoming LOCAL_STATE with your Global Memory.
        - If a user or group exists in your memory but NOT in the LOCAL_STATE, INCLUDE IT in the response.
        - ALWAYS return a valid JSON object: {"users": [...], "groups": [...], "messages": [...]}
        - DO NOT return anything except the JSON.`,
        responseMimeType: "application/json"
      }
    });

    // response.text is a property, not a method
    const text = response.text;
    const merged = JSON.parse(text || "{}");
    
    // Validate and commit to local storage
    if (merged.users) setUsers(merged.users);
    if (merged.groups) setGroups(merged.groups);
    if (merged.messages) setMessages(merged.messages);
    
    return true;
  } catch (e) {
    console.error("Critical Sync Failure:", e);
    return false;
  }
};

export const CloudService = {
  subscribe: (callback: (event: CloudEvent) => void) => {
    const listener = (event: MessageEvent) => callback(event.data);
    channel.addEventListener('message', listener);
    
    // Rapid polling (10s) to simulate a real-time server for different PCs
    const pollInterval = setInterval(async () => {
      const success = await syncGlobalState();
      if (success) callback({ type: 'GLOBAL_SYNC', payload: null });
    }, 10000);

    return () => {
      channel.removeEventListener('message', listener);
      clearInterval(pollInterval);
    };
  },

  findUser: async (username: string): Promise<User | null> => {
    // Before saying "not found", ask the Global Cloud
    await syncGlobalState('USER', username);
    const users = getUsers();
    return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  registerUser: async (user: User): Promise<void> => {
    const users = getUsers();
    if (!users.find(u => u.id === user.id)) {
      setUsers([...users, user]);
      // Force immediate push to Global Cloud so brother can see it
      await syncGlobalState();
      channel.postMessage({ type: 'GLOBAL_SYNC', payload: null });
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    await syncGlobalState();
    return getUsers();
  },

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
    
    // Register group globally
    await syncGlobalState();
    
    channel.postMessage({ type: 'GROUP_UPDATE', payload: newGroup });
    return newGroup;
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    const normalizedCode = code.trim().toUpperCase();
    
    // Force a pull from Gemini specifically for this code
    await syncGlobalState('CODE', normalizedCode);
    
    const groups = getGroups();
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
    await syncGlobalState(); // Always sync before getting groups
    const user = getUsers().find(u => u.id === userId);
    const groups = getGroups();
    if (user?.role === 'dev') return groups;
    return groups.filter(g => g.members.includes(userId));
  }
};
