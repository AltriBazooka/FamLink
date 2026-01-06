
import { createClient } from '@supabase/supabase-js';
import { User, Group, Message } from '../types.ts';
import { generateInviteCode } from './storage.ts';

// User provided Supabase project details
const SUPABASE_URL = 'https://ybzyygrhjfwxddcqhmrv.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlienl5Z3JoamZ3eGRkY3FobXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzE2MjEsImV4cCI6MjA4MzMwNzYyMX0.Y9PHoN3jDlstP0myD6SLJcivngspNNaNAQw-oNXf9-M';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export const CloudService = {
  subscribe: (callback: (event: any) => void) => {
    const channel = supabase
      .channel('famlink-realtime')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        console.log('Realtime change received:', payload);
        callback({ type: 'GLOBAL_SYNC' });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to realtime changes');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  },

  findUser: async (username: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .maybeSingle();
      
      if (error) {
        console.error("Supabase findUser error:", error.message);
        throw error;
      }
      if (!data) return null;

      return {
        id: data.id,
        username: data.username,
        password: data.password,
        avatar: data.avatar,
        role: data.role as 'user' | 'dev',
        createdAt: Date.parse(data.created_at)
      };
    } catch (e) {
      console.error("Failed to fetch user from Supabase:", e);
      throw e;
    }
  },

  registerUser: async (user: User): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .insert([{
        id: user.id,
        username: user.username,
        password: user.password,
        avatar: user.avatar,
        role: user.role
      }]);
    if (error) {
      console.error("Supabase registration error:", error.message);
      throw error;
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    if (error) return [];
    return data.map(u => ({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      role: u.role as 'user' | 'dev',
      createdAt: Date.parse(u.created_at)
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
    
    const { error: groupError } = await supabase.from('groups').insert([{
      id: groupId,
      name,
      description,
      admin_id: adminId,
      invite_code: inviteCode
    }]);

    if (groupError) throw groupError;

    const { error: memberError } = await supabase.from('group_members').insert([{
      group_id: groupId,
      user_id: adminId
    }]);

    if (memberError) throw memberError;

    return {
      id: groupId,
      name,
      description,
      adminId,
      members: [adminId],
      inviteCode,
      createdAt: Date.now()
    };
  },

  joinGroupByCode: async (code: string, userId: string): Promise<Group | null> => {
    const { data: group, error } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', code.toUpperCase())
      .maybeSingle();

    if (error || !group) return null;

    const { error: joinError } = await supabase
      .from('group_members')
      .upsert([{ group_id: group.id, user_id: userId }], { onConflict: 'group_id,user_id' });

    if (joinError) throw joinError;

    return CloudService.getGroupWithMembers(group.id);
  },

  getGroupWithMembers: async (groupId: string): Promise<Group | null> => {
    const { data: group, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_members (user_id)
      `)
      .eq('id', groupId)
      .maybeSingle();

    if (error || !group) return null;

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      adminId: group.admin_id,
      inviteCode: group.invite_code,
      createdAt: Date.parse(group.created_at),
      members: group.group_members.map((m: any) => m.user_id)
    };
  },

  deleteGroup: async (groupId: string, adminId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)
      .eq('admin_id', adminId);
    return !error;
  },

  sendMessage: async (groupId: string, sender: User, text: string): Promise<Message> => {
    const id = crypto.randomUUID();
    const { error } = await supabase.from('messages').insert([{
      id,
      group_id: groupId,
      sender_id: sender.id,
      sender_name: sender.username,
      text
    }]);

    if (error) throw error;

    return {
      id,
      groupId,
      senderId: sender.id,
      senderName: sender.username,
      text,
      timestamp: Date.now()
    };
  },

  getGroupMessages: async (groupId: string): Promise<Message[]> => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('group_id', groupId)
      .order('timestamp', { ascending: true });
    
    if (error) return [];
    return data.map(m => ({
      id: m.id,
      groupId: m.group_id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      text: m.text,
      timestamp: Date.parse(m.timestamp)
    }));
  },

  getAllUserGroups: async (userId: string): Promise<Group[]> => {
    const { data, error } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    if (error || !data) return [];

    const results: Group[] = [];
    for (const item of data) {
      const g = await CloudService.getGroupWithMembers(item.group_id);
      if (g) results.push(g);
    }
    return results;
  }
};
