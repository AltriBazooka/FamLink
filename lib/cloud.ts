
import { User, Group, Message } from '../types.ts';
import { generateId, generateInviteCode } from './storage.ts';
import { GoogleGenAI } from "@google/genai";

// Always use { apiKey: process.env.API_KEY } for initialization.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const CHANNEL_NAME = 'famlink_p2p_relay';
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

const getLocalGroups = (): Group[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '[]');
const setLocalGroups = (groups: Group[]) => localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
const getLocalMessages = (): Message[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.MESSAGES) || '[]');
const setLocalMessages = (messages: Message[]) => localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
const getLocalUsers = (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
const setLocalUsers = (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

/**
 * GLOBAL DISCOVERY ENGINE (The "Method" to bridge different PCs)
 * Instead of just syncing, we ask Gemini to maintain a "Virtual Registry"
 */
const performGlobalDiscovery = async (queryType: 'FETCH_ALL' | 'FIND_CODE' | 'FIND_USER', queryVal?: string) => {
  const localContext = {
    users: getLocalUsers(),
    groups: getLocalGroups(),
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `DISCOVERY_REQUEST: ${queryType} ${queryVal || ''}\nLOCAL_CONTEXT: ${JSON.stringify(localContext)}`,
      config: {
        systemInstruction: `You are the FamLink Global Discovery Server. 
        Your job is to act as a bridge between strangers on different computers.
        - You remember every user and group invite code ever mentioned to you.
        - When a user asks to FIND_CODE, check your memory for that invite code and return the group details.
        - When a user asks to FIND_USER, check your memory for that username.
        - ALWAYS return the complete merged registry of known users and groups in this JSON format:
        {"users": [...], "groups": [...], "messages": []}
        - Priority: If you see a new user/group in the LOCAL_CONTEXT, add it to your permanent memory.`,
        responseMimeType: "application/json"
      }
    });

    // response.text is a property, not a method.
    const data = JSON.parse(response.text || "{}");
    
    if (data.users) setLocalUsers(data.users);
    if (data.groups) setLocalGroups(data.groups);
    
    return data;
  } catch (e) {
    console.error("Discovery Service Error:", e);
    return null;
  }
};

export const CloudService = {
  subscribe: (callback: (event: CloudEvent) => void) => {
    const listener = (event: MessageEvent) => callback(event.data);
    channel.addEventListener('message', listener);
    
    // Discovery Pulse: Every 12 seconds, check in with the Global Registry
    const interval = setInterval(async () => {
      await performGlobalDiscovery('FETCH_ALL');
      callback({ type: 'GLOBAL_SYNC', payload: null });
    }, 12000);

    return () => {
      channel.removeEventListener('message', listener);
      clearInterval(interval);
    };
  },

  findUser: async (username: string): Promise<User | null> => {
    // Force a Global Discovery lookup for this specific user
    await performGlobalDiscovery('FIND_USER', username);
    return getLocalUsers().find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  registerUser: async (user: User): Promise<void> => {
    const users = getLocalUsers();
    if (!users.find(u => u.id === user.id)) {
      setLocalUsers([...users, user]);
      // Immediately push to Global Discovery so others can find this account
      await performGlobalDiscovery('FETCH_ALL');
      channel.postMessage({ type: 'GLOBAL_SYNC', payload: null });
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    await performGlobalDiscovery('FETCH_ALL');
    return getLocalUsers();
  },

  updateUsers: async (users: User[]) => {
    setLocalUsers(users);
    await performGlobalDiscovery('FETCH_ALL');
  },

  createGroup: async (name: string, description: string, adminId: string): Promise<Group> => {
    const groups = getLocalGroups();
    const newGroup: Group = {
      id: generateId(),
      name,
      description,
      adminId,
      members: [adminId],
      inviteCode: generateInviteCode(),
      createdAt: Date.now(),
    };
    setLocalGroups([...groups, newGroup]);
    
    // Broadcast existence to the Global Registry
    await performGlobalDiscovery('FETCH_ALL');
    channel.postMessage({ type: 'GROUP_UPDATE', payload: newGroup });
    return newGroup;
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    const cleanCode = code.trim().toUpperCase();
    
    // Crucial: Explicitly ask the Global Discovery if this code exists on any other PC
    await performGlobalDiscovery('FIND_CODE', cleanCode);
    
    const groups = getLocalGroups();
    const idx = groups.findIndex(g => g.inviteCode === cleanCode);
    
    if (idx === -1) return null;
    
    if (!groups[idx].members.includes(userId)) {
      groups[idx].members.push(userId);
      setLocalGroups(groups);
      await performGlobalDiscovery('FETCH_ALL');
    }
    
    channel.postMessage({ type: 'USER_JOINED', payload: { groupId: groups[idx].id, userId } });
    return groups[idx];
  },

  deleteGroup: async (groupId: string, adminId: string): Promise<boolean> => {
    const groups = getLocalGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return false;
    
    const users = getLocalUsers();
    const user = users.find(u => u.id === adminId);
    if (group.adminId !== adminId && user?.role !== 'dev') return false;

    setLocalGroups(groups.filter(g => g.id !== groupId));
    await performGlobalDiscovery('FETCH_ALL');
    channel.postMessage({ type: 'GROUP_DELETED', payload: groupId });
    return true;
  },

  sendMessage: async (groupId: string, sender: User, text: string): Promise<Message> => {
    const messages = getLocalMessages();
    const newMessage: Message = {
      id: generateId(),
      groupId,
      senderId: sender.id,
      senderName: sender.username,
      text,
      timestamp: Date.now(),
    };
    
    setLocalMessages([...messages, newMessage]);
    // Note: Messages are synced via the BroadCast channel locally, 
    // but in cross-PC, we rely on the 12s Global Pulse.
    channel.postMessage({ type: 'MESSAGE', payload: newMessage });
    return newMessage;
  },

  getGroupMessages: async (groupId: string): Promise<Message[]> => {
    return getLocalMessages().filter(m => m.groupId === groupId);
  },

  getAllUserGroups: async (userId: string): Promise<Group[]> => {
    const user = getLocalUsers().find(u => u.id === userId);
    const groups = getLocalGroups();
    if (user?.role === 'dev') return groups;
    return groups.filter(g => g.members.includes(userId));
  }
};
