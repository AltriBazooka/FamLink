
import React, { useState, useEffect, useCallback } from 'react';
import { User, Group, Message, ViewType } from './types.ts';
import { 
  getCurrentUser, 
  setCurrentUser,
  generateId
} from './lib/storage.ts';
import { CloudService } from './lib/cloud.ts';
import { AuthPage } from './components/AuthPage.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { DevAdminPanel } from './components/DevAdminPanel.tsx';
import { CreateGroupModal, JoinGroupModal, InviteModal } from './components/Modals.tsx';

const DEV_CREDENTIALS = {
  username: 'AltriDev',
  password: 'DevBazooka1169'
};

const App: React.FC = () => {
  const [currentUser, setAuthUser] = useState<User | null>(getCurrentUser());
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const [modals, setModals] = useState<{
    create: boolean;
    join: boolean;
    invite: boolean;
    error: string | null;
  }>({ create: false, join: false, invite: false, error: null });

  const syncState = useCallback(async () => {
    if (!currentUser) return;
    const userGroups = await CloudService.getAllUserGroups(currentUser.id);
    setGroups(userGroups);
    if (activeGroupId) {
      const groupMsgs = await CloudService.getGroupMessages(activeGroupId);
      setMessages(groupMsgs);
    }
  }, [currentUser, activeGroupId]);

  // Initial Sync
  useEffect(() => {
    syncState();
  }, [syncState]);

  // SUBSCRIBE TO REAL-TIME & POLL UPDATES
  useEffect(() => {
    const unsubscribe = CloudService.subscribe((event) => {
      switch (event.type) {
        case 'MESSAGE':
          const msg = event.payload as Message;
          if (msg.groupId === activeGroupId) {
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
            });
          }
          break;
        case 'GLOBAL_SYNC':
        case 'USER_JOINED':
        case 'GROUP_UPDATE':
          syncState();
          break;
        case 'GROUP_DELETED':
          const deletedId = event.payload as string;
          setGroups(prev => prev.filter(g => g.id !== deletedId));
          if (activeGroupId === deletedId) {
            setActiveGroupId(null);
            setCurrentView('dashboard');
            alert("Group dissolved.");
          }
          break;
      }
    });

    return unsubscribe;
  }, [activeGroupId, currentUser, syncState]);

  const handleAuth = async (username: string, password: string, isSignup: boolean) => {
    // 1. Check Global Discovery Service for User
    let user = await CloudService.findUser(username);
    
    // Dev login check
    if (username === DEV_CREDENTIALS.username && password === DEV_CREDENTIALS.password) {
      if (!user) {
        user = {
          id: 'dev-master',
          username,
          password,
          role: 'dev',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AltriDev',
          createdAt: Date.now()
        };
        await CloudService.registerUser(user);
      }
      setAuthUser(user);
      setCurrentUser(user);
      setCurrentView('dashboard');
      return;
    }

    if (isSignup) {
      if (user) {
        alert("Username already exists on the FamLink network!");
        return;
      }
      user = {
        id: generateId(),
        username,
        password,
        role: 'user',
        avatar: `https://picsum.photos/seed/${username}/200`,
        createdAt: Date.now()
      };
      await CloudService.registerUser(user);
    } else {
      if (!user) {
        alert("Account not found. Please sign up or check the network connection.");
        return;
      }
      if (user.password !== password) {
        alert("Incorrect password.");
        return;
      }
    }

    setAuthUser(user);
    setCurrentUser(user);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setAuthUser(null);
    setCurrentUser(null);
    setActiveGroupId(null);
  };

  const handleCreateGroup = async (name: string, description: string) => {
    if (!currentUser) return;
    const newGroup = await CloudService.createGroup(name, description, currentUser.id);
    setGroups(prev => [...prev, newGroup]);
    setActiveGroupId(newGroup.id);
    setCurrentView('chat');
    setModals(m => ({ ...m, create: false }));
  };

  const handleJoinGroup = async (code: string) => {
    if (!currentUser) return;
    const group = await CloudService.joinGroupByCode(code, currentUser.id);
    
    if (!group) {
      setModals(m => ({ ...m, error: "Invite code not found in Global Discovery" }));
      return;
    }

    await syncState();
    setActiveGroupId(group.id);
    setCurrentView('chat');
    setModals(m => ({ ...m, join: false, error: null }));
  };

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !activeGroupId) return;
    const msg = await CloudService.sendMessage(activeGroupId, currentUser, text);
    setMessages(prev => [...prev, msg].sort((a, b) => a.timestamp - b.timestamp));
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!currentUser) return;
    const success = await CloudService.deleteGroup(groupId, currentUser.id);
    if (success) {
      setGroups(prev => prev.filter(g => g.id !== groupId));
      setActiveGroupId(null);
      setCurrentView('dashboard');
    }
  };

  const handleUpdateProfile = async (newUsername: string) => {
    if (!currentUser) return;
    const allUsers = await CloudService.getAllUsers();
    const updatedUser = { ...currentUser, username: newUsername };
    const newUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    await CloudService.updateUsers(newUsers);
    setAuthUser(updatedUser);
    setCurrentUser(updatedUser);
  };

  if (!currentUser) {
    return <AuthPage onAuth={handleAuth} />;
  }

  const activeGroup = groups.find(g => g.id === activeGroupId) || null;

  return (
    <div className="h-screen flex bg-purple-50">
      <Sidebar 
        groups={groups}
        activeGroupId={activeGroupId}
        currentUser={currentUser}
        currentView={currentView}
        onSelectGroup={(id) => { setActiveGroupId(id); setCurrentView('chat'); }}
        onNavigate={setCurrentView}
        onCreateGroup={() => setModals(m => ({ ...m, create: true }))}
        onJoinGroup={() => setModals(m => ({ ...m, join: true, error: null }))}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex overflow-hidden">
        {currentView === 'dashboard' && (
          <Dashboard 
            currentUser={currentUser}
            groups={groups}
            onCreateGroup={() => setModals(m => ({ ...m, create: true }))}
            onJoinGroup={() => setModals(m => ({ ...m, join: true, error: null }))}
            onSelectGroup={(id) => { setActiveGroupId(id); setCurrentView('chat'); }}
            onNavigate={setCurrentView}
          />
        )}
        
        {currentView === 'profile' && (
          <ProfileView 
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {currentView === 'chat' && (
          <ChatArea 
            group={activeGroup}
            messages={messages}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onInvite={() => setModals(m => ({ ...m, invite: true }))}
            onDeleteGroup={handleDeleteGroup}
          />
        )}

        {currentView === 'admin-panel' && currentUser.role === 'dev' && (
          <DevAdminPanel 
            onLogout={handleLogout}
          />
        )}
      </main>

      {modals.create && <CreateGroupModal onClose={() => setModals(m => ({ ...m, create: false }))} onCreate={handleCreateGroup} />}
      {modals.join && <JoinGroupModal onClose={() => setModals(m => ({ ...m, join: false }))} onJoin={handleJoinGroup} error={modals.error || undefined} />}
      {modals.invite && activeGroup && <InviteModal group={activeGroup} onClose={() => setModals(m => ({ ...m, invite: false }))} />}
    </div>
  );
};

export default App;
