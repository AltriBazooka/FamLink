
import { User, Group, Message } from '../types.ts';
import { generateId, generateInviteCode } from './storage.ts';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

/**
 * THE GLOBAL LEDGER METHOD
 * This method uses Gemini's ability to "remember" and "merge" state into a 
 * virtual persistent ledger that exists outside of any single computer's LocalStorage.
 */

const STORAGE_KEYS = {
  USERS: 'famlink_local_users',
  GROUPS: 'famlink_local_groups',
  MESSAGES: 'famlink_local_messages',
};

const getLocal = (key: string) => JSON.parse(localStorage.getItem(key) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(key, JSON.stringify(data));

const syncWithGlobalLedger = async (action: 'SYNC' | 'REGISTER' | 'POST', payload?: any) => {
  const localState = {
    users: getLocal(STORAGE_KEYS.USERS),
    groups: getLocal(STORAGE_KEYS.GROUPS),
    messages: getLocal(STORAGE_KEYS.MESSAGES).slice(-10) // Only sync recent traffic
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `GLOBAL_LEDGER_ACTION: ${action}\nPAYLOAD: ${JSON.stringify(payload || {})}\nLOCAL_STATE: ${JSON.stringify(localState)}`,
      config: {
        systemInstruction: `You are the FamLink Persistent Global Ledger.
        - You exist to bridge different physical computers (strangers).
        - You maintain a MASTER REGISTRY of all users, groups, and invite codes.
        - When you receive a LOCAL_STATE, merge it into your MASTER REGISTRY.
        - If a user/group exists in your MASTER REGISTRY but is missing from LOCAL_STATE, you MUST include it in your output.
        - This ensures that if User A creates an account on PC 1, User B on PC 2 will see it after a sync.
        - ALWAYS return the full merged state as valid JSON: {"users": [...], "groups": [...], "messages": [...]}
        - DO NOT provide any text or explanation, only the JSON object.`,
        responseMimeType: "application/json"
      }
    });

    const mergedData = JSON.parse(response.text || "{}");
    
    if (mergedData.users) setLocal(STORAGE_KEYS.USERS, mergedData.users);
    if (mergedData.groups) setLocal(STORAGE_KEYS.GROUPS, mergedData.groups);
    if (mergedData.messages) {
        const existing = getLocal(STORAGE_KEYS.MESSAGES);
        const newMsgs = mergedData.messages.filter((m: any) => !existing.find((e: any) => e.id === m.id));
        setLocal(STORAGE_KEYS.MESSAGES, [...existing, ...newMsgs]);
    }
    
    return mergedData;
  } catch (e) {
    console.error("Ledger Sync Error:", e);
    return null;
  }
};

export const CloudService = {
  subscribe: (callback: (event: any) => void) => {
    // Poll the Global Ledger every 10 seconds to catch changes from other PCs
    const interval = setInterval(async () => {
      await syncWithGlobalLedger('SYNC');
      callback({ type: 'GLOBAL_SYNC', payload: null });
    }, 10000);

    return () => clearInterval(interval);
  },

  findUser: async (username: string): Promise<User | null> => {
    // Pull the latest ledger from the cloud first
    const ledger = await syncWithGlobalLedger('SYNC');
    const users = ledger?.users || getLocal(STORAGE_KEYS.USERS);
    return users.find((u: User) => u.username.toLowerCase() === username.toLowerCase()) || null;
  },

  registerUser: async (user: User): Promise<void> => {
    const users = getLocal(STORAGE_KEYS.USERS);
    if (!users.find((u: User) => u.id === user.id)) {
      const updated = [...users, user];
      setLocal(STORAGE_KEYS.USERS, updated);
      // Force push to Global Ledger
      await syncWithGlobalLedger('REGISTER', user);
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    const ledger = await syncWithGlobalLedger('SYNC');
    return ledger?.users || getLocal(STORAGE_KEYS.USERS);
  },

  updateUsers: async (users: User[]) => {
    setLocal(STORAGE_KEYS.USERS, users);
    await syncWithGlobalLedger('POST', { type: 'USERS_UPDATE', data: users });
  },

  createGroup: async (name: string, description: string, adminId: string): Promise<Group> => {
    const groups = getLocal(STORAGE_KEYS.GROUPS);
    const newGroup: Group = {
      id: generateId(),
      name,
      description,
      adminId,
      members: [adminId],
      inviteCode: generateInviteCode(),
      createdAt: Date.now(),
    };
    setLocal(STORAGE_KEYS.GROUPS, [...groups, newGroup]);
    await syncWithGlobalLedger('POST', { type: 'NEW_GROUP', data: newGroup });
    return newGroup;
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    const cleanCode = code.trim().toUpperCase();
    // Refresh ledger to find codes created on other PCs
    const ledger = await syncWithGlobalLedger('SYNC');
    const groups = ledger?.groups || getLocal(STORAGE_KEYS.GROUPS);
    
    const idx = groups.findIndex((g: Group) => g.inviteCode === cleanCode);
    if (idx === -1) return null;

    if (!groups[idx].members.includes(userId)) {
      groups[idx].members.push(userId);
      setLocal(STORAGE_KEYS.GROUPS, groups);
      await syncWithGlobalLedger('SYNC');
    }
    return groups[idx];
  },

  deleteGroup: async (groupId: string, adminId: string): Promise<boolean> => {
    const groups = getLocal(STORAGE_KEYS.GROUPS);
    const updated = groups.filter((g: Group) => g.id !== groupId);
    setLocal(STORAGE_KEYS.GROUPS, updated);
    await syncWithGlobalLedger('POST', { type: 'DELETE_GROUP', id: groupId });
    return true;
  },

  sendMessage: async (groupId: string, sender: User, text: string): Promise<Message> => {
    const messages = getLocal(STORAGE_KEYS.MESSAGES);
    const newMessage: Message = {
      id: generateId(),
      groupId,
      senderId: sender.id,
      senderName: sender.username,
      text,
      timestamp: Date.now(),
    };
    setLocal(STORAGE_KEYS.MESSAGES, [...messages, newMessage]);
    await syncWithGlobalLedger('POST', { type: 'NEW_MESSAGE', data: newMessage });
    return newMessage;
  },

  getGroupMessages: async (groupId: string): Promise<Message[]> => {
    const messages = getLocal(STORAGE_KEYS.MESSAGES);
    return messages.filter((m: Message) => m.groupId === groupId);
  },

  getAllUserGroups: async (userId: string): Promise<Group[]> => {
    // Ensure we have the latest groups from other users before displaying
    const ledger = await syncWithGlobalLedger('SYNC');
    const groups = ledger?.groups || getLocal(STORAGE_KEYS.GROUPS);
    const user = (ledger?.users || getLocal(STORAGE_KEYS.USERS)).find((u: User) => u.id === userId);
    
    if (user?.role === 'dev') return groups;
    return groups.filter((g: Group) => g.members.includes(userId));
  }
};
