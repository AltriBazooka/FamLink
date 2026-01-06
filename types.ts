
export interface User {
  id: string;
  username: string;
  avatar: string;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  adminId: string;
  members: string[]; // User IDs
  inviteCode: string;
  createdAt: number;
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export type ViewType = 'chat' | 'dashboard' | 'profile';

export interface AppState {
  currentUser: User | null;
  groups: Group[];
  messages: Message[];
  activeGroupId: string | null;
  currentView: ViewType;
}
