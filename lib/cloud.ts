
import { createClient } from '@supabase/supabase-js';
import { User, Group, Message } from '../types.ts';
import { generateInviteCode } from './storage.ts';

const SUPABASE_URL = 'https://ybzyygrhjfwxddcqhmrv.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlienl5Z3JoamZ3eGRkY3FobXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzE2MjEsImV4cCI6MjA4MzMwNzYyMX0.Y9PHoN3jDlstP0myD6SLJcivngspNNaNAQw-oNXf9-M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const CloudService = {
  subscribe: (callback: (event: any) => void) => {
    const channel = supabase
      .channel('famlink-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        callback({ type: 'GLOBAL_SYNC' });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  uploadFile: async (file: File): Promise<{ url: string; type: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('famlink-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('famlink-files')
      .getPublicUrl(filePath);

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    if (file.type.startsWith('video/')) type = 'video';

    return { url: data.publicUrl, type };
  },

  findUser: async (username: string): Promise<User | null> => {
    const { data, error } = await supabase.from('users').select('*').eq('username', username).maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      username: data.username,
      password: data.password,
      avatar: data.avatar,
      role: data.role as 'user' | 'dev',
      createdAt: Date.parse(data.created_at)
    };
  },

  registerUser: async (user: User): Promise<void> => {
    await supabase.from('users').insert([{
      id: user.id, username: user.username, password: user.password, avatar: user.avatar, role: user.role
    }]);
  },

  getAllUsers: async (): Promise<User[]> => {
    const { data } = await supabase.from('users').select('*');
    return (data || []).map(u => ({
      id: u.id, username: u.username, avatar: u.avatar, role: u.role as 'user' | 'dev', createdAt: Date.parse(u.created_at)
    }));
  },

  updateUsers: async (users: User[]) => {
    for (const user of users) {
      await supabase.from('users').update({ username: user.username }).eq('id', user.id);
    }
  },

  createGroup: async (name: string, description: string, adminId: string): Promise<Group> => {
    const groupId = crypto.randomUUID();
    const inviteCode = generateInviteCode();
    await supabase.from('groups').insert([{ id: groupId, name, description, admin_id: adminId, invite_code: inviteCode }]);
    await supabase.from('group_members').insert([{ group_id: groupId, user_id: adminId }]);
    return { id: groupId, name, description, adminId, members: [adminId], inviteCode, createdAt: Date.now() };
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    const { data: group } = await supabase.from('groups').select('*').eq('invite_code', code.toUpperCase()).maybeSingle();
    if (!group) return null;
    await supabase.from('group_members').upsert([{ group_id: group.id, user_id: userId }], { onConflict: 'group_id,user_id' });
    return CloudService.getGroupWithMembers(group.id);
  },

  getGroupWithMembers: async (groupId: string): Promise<Group | null> => {
    const { data: group } = await supabase.from('groups').select('*, group_members (user_id)').eq('id', groupId).maybeSingle();
    if (!group) return null;
    return {
      id: group.id, name: group.name, description: group.description, adminId: group.admin_id,
      inviteCode: group.invite_code, createdAt: Date.parse(group.created_at),
      members: group.group_members.map((m: any) => m.user_id)
    };
  },

  deleteGroup: async (groupId: string, adminId: string): Promise<boolean> => {
    const { error } = await supabase.from('groups').delete().eq('id', groupId).eq('admin_id', adminId);
    return !error;
  },

  sendMessage: async (groupId: string, sender: User, text: string, fileData?: { url: string; type: string }): Promise<Message> => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('messages').insert([{
      id, group_id: groupId, sender_id: sender.id, sender_name: sender.username,
      text, file_url: fileData?.url, file_type: fileData?.type
    }]);

    if (error) throw error;

    return {
      id, groupId, senderId: sender.id, senderName: sender.username,
      text, timestamp: Date.now(), fileUrl: fileData?.url, fileType: fileData?.type
    };
  },

  getGroupMessages: async (groupId: string): Promise<Message[]> => {
    const { data } = await supabase.from('messages').select('*').eq('group_id', groupId).order('timestamp', { ascending: true });
    return (data || []).map(m => ({
      id: m.id, groupId: m.group_id, senderId: m.sender_id, senderName: m.sender_name,
      text: m.text, timestamp: Date.parse(m.timestamp), fileUrl: m.file_url, fileType: m.file_type
    }));
  },

  getAllUserGroups: async (userId: string): Promise<Group[]> => {
    const { data } = await supabase.from('group_members').select('group_id').eq('user_id', userId);
    if (!data) return [];
    const results: Group[] = [];
    for (const item of data) {
      const g = await CloudService.getGroupWithMembers(item.group_id);
      if (g) results.push(g);
    }
    return results;
  }
};
