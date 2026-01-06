
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
  const [isLoading, setIsLoading] = useState(false);

  const [modals, setModals] = useState<{
    create: boolean;
    join: boolean;
    invite: boolean;
    error: string | null;
  }>({ create: false, join: false, invite: false, error: null });

  const syncState = useCallback(async () => {
    if (!currentUser) return;
    try {
      const userGroups = await CloudService.getAllUserGroups(currentUser.id);
      setGroups(userGroups);
      if (activeGroupId && currentView === 'chat') {
        const groupMsgs = await CloudService.getGroupMessages(activeGroupId);
        setMessages(groupMsgs);
      }
    } catch (err) {
      console.error("Sync failed:", err);
    }
  }, [currentUser, activeGroupId, currentView]);

  useEffect(() => {
    if (currentUser) {
       syncState();
       const unsubscribe = CloudService.subscribe(() => syncState());
       return unsubscribe;
    }
  }, [currentUser, syncState]);

  const handleAuth = async (username: string, password: string, isSignup: boolean) => {
    setIsLoading(true);
    try {
      const user = await CloudService.findUser(username);
      
      if (username === DEV_CREDENTIALS.username && password === DEV_CREDENTIALS.password) {
        let devUser = user;
        if (!devUser) {
          devUser = {
            id: generateId(),
            username,
            password,
            role: 'dev',
            avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
            createdAt: Date.now()
          };
          await CloudService.registerUser(devUser);
        }
        setAuthUser(devUser);
        setCurrentUser(devUser);
        return;
      }

      if (isSignup) {
        if (user) {
          alert("This username is already taken. Choose another.");
          return;
        }
        const newUser: User = {
          id: generateId(),
          username,
          password,
          role: 'user',
          avatar: `https://picsum.photos/seed/${username}/200`,
          createdAt: Date.now()
        };
        await CloudService.registerUser(newUser);
        setAuthUser(newUser);
        setCurrentUser(newUser);
      } else {
        if (!user) {
          alert("No account found with that username.");
          return;
        }
        if (user.password !== password) {
          alert("Incorrect password.");
          return;
        }
        setAuthUser(user);
        setCurrentUser(user);
      }
      setCurrentView('dashboard');
    } catch (err) {
      alert("Auth failed. Check database connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthUser(null);
    setCurrentUser(null);
    setActiveGroupId(null);
  };

  const handleCreateGroup = async (name: string, description: string) => {
    if (!currentUser) return;
    try {
      const newGroup = await CloudService.createGroup(name, description, currentUser.id);
      await syncState();
      setActiveGroupId(newGroup.id);
      setCurrentView('chat');
      setModals(m => ({ ...m, create: false }));
    } catch (err) {
      alert("Failed to create group.");
    }
  };

  const handleJoinGroup = async (code: string) => {
    if (!currentUser) return;
    try {
      const group = await CloudService.joinGroupByCode(code, currentUser.id);
      if (!group) {
        setModals(m => ({ ...m, error: "Invalid invite code. Try again." }));
        return;
      }
      await syncState();
      setActiveGroupId(group.id);
      setCurrentView('chat');
      setModals(m => ({ ...m, join: false, error: null }));
    } catch (err) {
      alert("Failed to join group.");
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !activeGroupId) return;
    try {
      await CloudService.sendMessage(activeGroupId, currentUser, text);
      // Real-time subscription will update the UI automatically
    } catch (err) {
      console.error("Message send failed:", err);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!currentUser) return;
    if (confirm("Are you sure you want to delete this group? All messages will be lost.")) {
      await CloudService.deleteGroup(groupId, currentUser.id);
      await syncState();
      setActiveGroupId(null);
      setCurrentView('dashboard');
    }
  };

  if (!currentUser) return <AuthPage onAuth={handleAuth} />;

  return (
    <div className="h-screen flex bg-purple-50 overflow-hidden">
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
          <ProfileView currentUser={currentUser} onUpdateProfile={async (name) => {
             const all = await CloudService.getAllUsers();
             const updated = all.map(u => u.id === currentUser.id ? {...u, username: name} : u);
             await CloudService.updateUsers(updated);
             setAuthUser({...currentUser, username: name});
          }} />
        )}
        {currentView === 'chat' && (
          <ChatArea 
            group={groups.find(g => g.id === activeGroupId) || null}
            messages={messages}
            currentUser={currentUser}
            onSendMessage={handleSendMessage}
            onInvite={() => setModals(m => ({ ...m, invite: true }))}
            onDeleteGroup={handleDeleteGroup}
          />
        )}
        {currentView === 'admin-panel' && currentUser.role === 'dev' && (
          <DevAdminPanel onLogout={handleLogout} />
        )}
      </main>

      {modals.create && <CreateGroupModal onClose={() => setModals(m => ({ ...m, create: false }))} onCreate={handleCreateGroup} />}
      {modals.join && <JoinGroupModal onClose={() => setModals(m => ({ ...m, join: false }))} onJoin={handleJoinGroup} error={modals.error || undefined} />}
      {modals.invite && activeGroupId && (
        <InviteModal 
          group={groups.find(g => g.id === activeGroupId)!} 
          onClose={() => setModals(m => ({ ...m, invite: false }))} 
        />
      )}
    </div>
  );
};

export default App;
