
import React, { useState, useEffect } from 'react';
import { User, Group, Message, AppState, ViewType } from './types.ts';
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
} from './lib/storage.ts';
import { AuthPage } from './components/AuthPage.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { CreateGroupModal, JoinGroupModal, InviteModal } from './components/Modals.tsx';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    currentUser: getCurrentUser(),
    groups: getStoredGroups(),
    messages: getStoredMessages(),
    activeGroupId: null,
    currentView: 'dashboard'
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

    setState(prev => ({ ...prev, currentUser: user, currentView: 'dashboard' }));
  };

  const handleUpdateProfile = (newUsername: string) => {
    if (!state.currentUser) return;
    
    const updatedUser = { ...state.currentUser, username: newUsername };
    const users = getStoredUsers().map(u => u.id === updatedUser.id ? updatedUser : u);
    setStoredUsers(users);
    
    setState(prev => ({ ...prev, currentUser: updatedUser }));
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null, activeGroupId: null, currentView: 'dashboard' }));
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
      activeGroupId: newGroup.id,
      currentView: 'chat'
    }));
    setModals(m => ({ ...m, create: false }));
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!state.currentUser) return;
    const group = state.groups.find(g => g.id === groupId);
    if (!group || group.adminId !== state.currentUser.id) return;

    if (!confirm(`Are you sure you want to dissolve "${group.name}"? All messages will be lost.`)) return;

    setState(prev => ({
      ...prev,
      groups: prev.groups.filter(g => g.id !== groupId),
      messages: prev.messages.filter(m => m.groupId !== groupId),
      activeGroupId: null,
      currentView: 'dashboard'
    }));
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
      activeGroupId: group.id,
      currentView: 'chat'
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

  const handleNavigate = (view: ViewType) => {
    setState(prev => ({ ...prev, currentView: view }));
  };

  const handleSelectGroup = (id: string) => {
    setState(prev => ({ ...prev, activeGroupId: id, currentView: 'chat' }));
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
        currentView={state.currentView}
        onSelectGroup={handleSelectGroup}
        onNavigate={handleNavigate}
        onCreateGroup={() => setModals(m => ({ ...m, create: true }))}
        onJoinGroup={() => setModals(m => ({ ...m, join: true, error: null }))}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex overflow-hidden">
        {state.currentView === 'dashboard' && (
          <Dashboard 
            currentUser={state.currentUser}
            groups={userGroups}
            onCreateGroup={() => setModals(m => ({ ...m, create: true }))}
            onJoinGroup={() => setModals(m => ({ ...m, join: true, error: null }))}
            onSelectGroup={handleSelectGroup}
            onNavigate={handleNavigate}
          />
        )}
        
        {state.currentView === 'profile' && (
          <ProfileView 
            currentUser={state.currentUser}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {state.currentView === 'chat' && (
          <ChatArea 
            group={activeGroup}
            messages={filteredMessages}
            currentUser={state.currentUser}
            onSendMessage={handleSendMessage}
            onInvite={() => setModals(m => ({ ...m, invite: true }))}
            onDeleteGroup={handleDeleteGroup}
          />
        )}
      </main>

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
