
import { User, Group, Message } from '../types.ts';
import { generateId, generateInviteCode } from './storage.ts';

/**
 * GLOBAL CLOUD SERVICE (Cross-Device Simulation)
 * Uses BroadcastChannel for same-device sync and Smart Polling
 * of LocalStorage "Cloud" keys which, in a real production app, 
 * would be replaced by a real database.
 */

const CHANNEL_NAME = 'famlink_cloud_sync';
const channel = new BroadcastChannel(CHANNEL_NAME);

export type CloudEventType = 'MESSAGE' | 'GROUP_UPDATE' | 'USER_JOINED' | 'GROUP_DELETED' | 'GLOBAL_SYNC';

interface CloudEvent {
  type: CloudEventType;
  payload: any;
}

const STORAGE_KEYS = {
  USERS: 'famlink_cloud_users', // Added users to cloud
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

export const CloudService = {
  // Listen for real-time updates
  subscribe: (callback: (event: CloudEvent) => void) => {
    const listener = (event: MessageEvent) => callback(event.data);
    channel.addEventListener('message', listener);
    
    // Simulating "Server Polling" for other devices
    // In a real app, this would be a WebSocket connection.
    const pollInterval = setInterval(() => {
      callback({ type: 'GLOBAL_SYNC', payload: null });
    }, 3000);

    return () => {
      channel.removeEventListener('message', listener);
      clearInterval(pollInterval);
    };
  },

  // Auth / Users
  findUser: async (username: string): Promise<User | null> => {
    const users = getUsers();
    return users.find(u => u.username === username) || null;
  },

  registerUser: async (user: User): Promise<void> => {
    const users = getUsers();
    if (!users.find(u => u.id === user.id)) {
      setUsers([...users, user]);
      channel.postMessage({ type: 'GLOBAL_SYNC', payload: null });
    }
  },

  getAllUsers: (): User[] => getUsers(),
  updateUsers: (users: User[]) => setUsers(users),

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
    channel.postMessage({ type: 'GROUP_UPDATE', payload: newGroup });
    return newGroup;
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    const groups = getGroups();
    const index = groups.findIndex(g => g.inviteCode === code.toUpperCase());
    
    if (index === -1) return null;
    if (groups[index].members.includes(userId)) return groups[index];

    groups[index].members.push(userId);
    setGroups(groups);
    
    channel.postMessage({ type: 'USER_JOINED', payload: { groupId: groups[index].id, userId } });
    return groups[index];
  },

  deleteGroup: async (groupId: string, adminId: string): Promise<boolean> => {
    const groups = getGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return false;
    
    // Dev can delete anything, Admin can delete their own
    const users = getUsers();
    const currentUser = users.find(u => u.id === adminId);
    if (group.adminId !== adminId && currentUser?.role !== 'dev') return false;

    setGroups(groups.filter(g => g.id !== groupId));
    
    // Cleanup messages
    const msgs = getMessages().filter(m => m.groupId !== groupId);
    setMessages(msgs);

    channel.postMessage({ type: 'GROUP_DELETED', payload: groupId });
    return true;
  },

  // Messaging
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
    channel.postMessage({ type: 'MESSAGE', payload: newMessage });
    return newMessage;
  },

  getGroupMessages: async (groupId: string): Promise<Message[]> => {
    return getMessages().filter(m => m.groupId === groupId);
  },

  getAllUserGroups: async (userId: string): Promise<Group[]> => {
    const groups = getGroups();
    const user = getUsers().find(u => u.id === userId);
    // Devs see all groups in their sidebar if they want, or just joined ones
    if (user?.role === 'dev') return groups;
    return groups.filter(g => g.members.includes(userId));
  }
};
