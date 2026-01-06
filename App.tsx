
import React, { useState, useEffect, useCallback } from 'react';
import { User, Group, Message, AppState } from './types';
import { 
  getStoredUsers, 
  setStoredUsers, 
  getStoredGroups, 
  setStoredGroups, 
  getStoredMessages, 
  setStoredMessages, 
  getCurrentUser, 
  setCurrentUser,
  generateId,
  generateInviteCode
} from './lib/storage';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { CreateGroupModal, JoinGroupModal, InviteModal } from './components/Modals';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: getCurrentUser(),
    groups: getStoredGroups(),
    messages: getStoredMessages(),
    activeGroupId: null
  });

  const [modals, setModals] = useState<{
    create: boolean;
    join: boolean;
    invite: boolean;
    error: string | null;
  }>({ create: false, join: false, invite: false, error: null });

  // Persistence effects
  useEffect(() => {
    setStoredGroups(state.groups);
  }, [state.groups]);

  useEffect(() => {
    setStoredMessages(state.messages);
  }, [state.messages]);

  useEffect(() => {
    setCurrentUser(state.currentUser);
  }, [state.currentUser]);

  const handleAuth = (username: string, isSignup: boolean) => {
    const users = getStoredUsers();
    let user = users.find(u => u.username === username);

    if (isSignup) {
      if (user) {
        alert("Username already taken!");
        return;
      }
      user = {
        id: generateId(),
        username,
        avatar: `https://picsum.photos/seed/${username}/200`,
        createdAt: Date.now()
      };
      setStoredUsers([...users, user]);
    } else if (!user) {
      alert("User not found!");
      return;
    }

    setState(prev => ({ ...prev, currentUser: user }));
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null, activeGroupId: null }));
  };

  const handleCreateGroup = (name: string, description: string) => {
    if (!state.currentUser) return;

    const newGroup: Group = {
      id: generateId(),
      name,
      description,
      adminId: state.currentUser.id,
      members: [state.currentUser.id],
      inviteCode: generateInviteCode(),
      createdAt: Date.now()
    };

    setState(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup],
      activeGroupId: newGroup.id
    }));
    setModals(m => ({ ...m, create: false }));
  };

  const handleJoinGroup = (code: string) => {
    if (!state.currentUser) return;

    const group = state.groups.find(g => g.inviteCode === code);
    if (!group) {
      setModals(m => ({ ...m, error: "Invalid invite code" }));
      return;
    }

    if (group.members.includes(state.currentUser.id)) {
      setModals(m => ({ ...m, error: "You are already a member of this group" }));
      return;
    }

    const updatedGroups = state.groups.map(g => {
      if (g.id === group.id) {
        return { ...g, members: [...g.members, state.currentUser!.id] };
      }
      return g;
    });

    setState(prev => ({
      ...prev,
      groups: updatedGroups,
      activeGroupId: group.id
    }));
    setModals(m => ({ ...m, join: false, error: null }));
  };

  const handleSendMessage = (text: string) => {
    if (!state.currentUser || !state.activeGroupId) return;

    const newMessage: Message = {
      id: generateId(),
      groupId: state.activeGroupId,
      senderId: state.currentUser.id,
      senderName: state.currentUser.username,
      text,
      timestamp: Date.now()
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage]
    }));
  };

  if (!state.currentUser) {
    return <AuthPage onAuth={handleAuth} />;
  }

  const activeGroup = state.groups.find(g => g.id === state.activeGroupId) || null;
  const filteredMessages = state.messages.filter(m => m.groupId === state.activeGroupId);
  const userGroups = state.groups.filter(g => g.members.includes(state.currentUser!.id));

  return (
    <div className="h-screen flex bg-purple-50">
      <Sidebar 
        groups={userGroups}
        activeGroupId={state.activeGroupId}
        currentUser={state.currentUser}
        onSelectGroup={(id) => setState(p => ({ ...p, activeGroupId: id }))}
        onCreateGroup={() => setModals(m => ({ ...m, create: true }))}
        onJoinGroup={() => setModals(m => ({ ...m, join: true, error: null }))}
        onLogout={handleLogout}
      />

      <ChatArea 
        group={activeGroup}
        messages={filteredMessages}
        currentUser={state.currentUser}
        onSendMessage={handleSendMessage}
        onInvite={() => setModals(m => ({ ...m, invite: true }))}
      />

      {/* Modals */}
      {modals.create && (
        <CreateGroupModal 
          onClose={() => setModals(m => ({ ...m, create: false }))}
          onCreate={handleCreateGroup}
        />
      )}
      {modals.join && (
        <JoinGroupModal 
          onClose={() => setModals(m => ({ ...m, join: false }))}
          onJoin={handleJoinGroup}
          error={modals.error || undefined}
        />
      )}
      {modals.invite && activeGroup && (
        <InviteModal 
          group={activeGroup}
          onClose={() => setModals(m => ({ ...m, invite: false }))}
        />
      )}
    </div>
  );
};

export default App;
