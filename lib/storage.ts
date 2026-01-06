
import { User, Group, Message } from '../types.ts';

const STORAGE_KEYS = {
  USERS: 'famlink_users_v1',
  GROUPS: 'famlink_groups_v1',
  MESSAGES: 'famlink_messages_v1',
  CURRENT_USER: 'famlink_active_user_v1'
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
};

export const setCurrentUser = (user: User | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

export const generateId = () => crypto.randomUUID();
export const generateInviteCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();
