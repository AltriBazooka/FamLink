
import React, { useState, useEffect } from 'react';
import { User, Group, Message, ViewType } from './types.ts';
import { 
  getStoredUsers, 
  setStoredUsers, 
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

  // Initialize data from "Cloud"
  useEffect(() => {
    if (currentUser) {
      CloudService.getAllUserGroups(currentUser.id).then(setGroups);
    }
  }, [currentUser]);

  // Handle active group messages
  useEffect(() => {
    if (activeGroupId) {
      CloudService.getGroupMessages(activeGroupId).then(setMessages);
    }
  }, [activeGroupId]);

  // SUBSCRIBE TO REAL-TIME CLOUD UPDATES
  useEffect(() => {
    const unsubscribe = CloudService.subscribe((event) => {
      switch (event.type) {
        case 'MESSAGE':
          const msg = event.payload as Message;
          if (msg.groupId === activeGroupId) {
            setMessages(prev => [...prev, msg]);
          }
          break;
        case 'GROUP_UPDATE':
          if (currentUser && event.payload.members.includes(currentUser.id)) {
            setGroups(prev => {
              const exists = prev.find(g => g.id === event.payload.id);
              return exists ? prev.map(g => g.id === event.payload.id ? event.payload : g) : [...prev, event.payload];
            });
          }
          break;
        case 'USER_JOINED':
          if (currentUser) {
            CloudService.getAllUserGroups(currentUser.id).then(setGroups);
          }
          break;
        case 'GROUP_DELETED':
          const deletedId = event.payload as string;
          setGroups(prev => prev.filter(g => g.id !== deletedId));
          if (activeGroupId === deletedId) {
            setActiveGroupId(null);
            setCurrentView('dashboard');
            alert("This group has been dissolved by the administrator.");
          }
          break;
      }
    });

    return unsubscribe;
  }, [activeGroupId, currentUser]);

  const handleAuth = (username: string, password: string, isSignup: boolean) => {
    const users = getStoredUsers();
    
    // Dev login check
    if (username === DEV_CREDENTIALS.username && password === DEV_CREDENTIALS.password) {
      let devUser = users.find(u => u.username === username);
      if (!devUser) {
        devUser = {
          id: 'dev-master',
          username,
          password,
          role: 'dev',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AltriDev',
          createdAt: Date.now()
        };
        setStoredUsers([...users, devUser]);
      }
      setAuthUser(devUser);
      setCurrentUser(devUser);
      setCurrentView('dashboard');
      return;
    }

    let user = users.find(u => u.username === username);

    if (isSignup) {
      if (user) {
        alert("Username already taken!");
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
      setStoredUsers([...users, user]);
    } else {
      if (!user) {
        alert("User not found!");
        return;
      }
      if (user.password !== password) {
        alert("Invalid password!");
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
      setModals(m => ({ ...m, error: "Invalid invite code" }));
      return;
    }

    const myGroups = await CloudService.getAllUserGroups(currentUser.id);
    setGroups(myGroups);
    setActiveGroupId(group.id);
    setCurrentView('chat');
    setModals(m => ({ ...m, join: false, error: null }));
  };

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !activeGroupId) return;
    const msg = await CloudService.sendMessage(activeGroupId, currentUser, text);
    setMessages(prev => [...prev, msg]);
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

  const handleUpdateProfile = (newUsername: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, username: newUsername };
    const users = getStoredUsers().map(u => u.id === updatedUser.id ? updatedUser : u);
    setStoredUsers(users);
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
