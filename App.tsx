
import React, { useState, useEffect, useCallback } from 'react';
import { User, Group, Message, ViewType } from './types.ts';
import { getCurrentUser, setCurrentUser, generateId } from './lib/storage.ts';
import { CloudService } from './lib/cloud.ts';
import { AuthPage } from './components/AuthPage.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { ChatArea } from './components/ChatArea.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { DevAdminPanel } from './components/DevAdminPanel.tsx';
import { CreateGroupModal, JoinGroupModal, InviteModal } from './components/Modals.tsx';

const DEV_CREDENTIALS = { username: 'AltriDev', password: 'DevBazooka1169' };

const App: React.FC = () => {
  const [currentUser, setAuthUser] = useState<User | null>(getCurrentUser());
  const [groups, setGroups] = useState<Group[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const [modals, setModals] = useState<{
    create: boolean; join: boolean; invite: boolean; error: string | null;
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
    } catch (err) { console.error(err); }
  }, [currentUser, activeGroupId, currentView]);

  useEffect(() => {
    if (currentUser) {
       syncState();
       return CloudService.subscribe(() => syncState());
    }
  }, [currentUser, syncState]);

  const handleAuth = async (username: string, password: string, isSignup: boolean) => {
    try {
      const user = await CloudService.findUser(username);
      if (username === DEV_CREDENTIALS.username && password === DEV_CREDENTIALS.password) {
        let devUser = user || { id: generateId(), username, password, role: 'dev', avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`, createdAt: Date.now() };
        if (!user) await CloudService.registerUser(devUser);
        setAuthUser(devUser as User);
        setCurrentUser(devUser as User);
        return;
      }
      if (isSignup) {
        if (user) { alert("Taken"); return; }
        const newUser: User = { id: generateId(), username, password, role: 'user', avatar: `https://picsum.photos/seed/${username}/200`, createdAt: Date.now() };
        await CloudService.registerUser(newUser);
        setAuthUser(newUser);
        setCurrentUser(newUser);
      } else {
        if (!user || user.password !== password) { alert("Invalid login"); return; }
        setAuthUser(user);
        setCurrentUser(user);
      }
      setCurrentView('dashboard');
    } catch (err) { alert("Connection Error"); }
  };

  const handleLogout = () => { setAuthUser(null); setCurrentUser(null); setActiveGroupId(null); };

  const handleSendMessage = async (text: string, fileData?: { url: string; type: string }) => {
    if (!currentUser || !activeGroupId) return;
    try {
      await CloudService.sendMessage(activeGroupId, currentUser, text, fileData);
    } catch (err) { console.error(err); }
  };

  if (!currentUser) return <AuthPage onAuth={handleAuth} />;

  return (
    <div className="h-screen flex bg-purple-50 overflow-hidden">
      <Sidebar 
        groups={groups} activeGroupId={activeGroupId} currentUser={currentUser} currentView={currentView}
        onSelectGroup={(id) => { setActiveGroupId(id); setCurrentView('chat'); }}
        onNavigate={setCurrentView} onLogout={handleLogout}
        onCreateGroup={() => setModals(m => ({ ...m, create: true }))}
        onJoinGroup={() => setModals(m => ({ ...m, join: true, error: null }))}
      />
      <main className="flex-1 flex overflow-hidden">
        {currentView === 'dashboard' && <Dashboard currentUser={currentUser} groups={groups} onSelectGroup={(id) => { setActiveGroupId(id); setCurrentView('chat'); }} onNavigate={setCurrentView} onCreateGroup={() => setModals(m => ({ ...m, create: true }))} onJoinGroup={() => setModals(m => ({ ...m, join: true, error: null }))} />}
        {currentView === 'profile' && <ProfileView currentUser={currentUser} onUpdateProfile={async (name) => {
             const all = await CloudService.getAllUsers();
             const updated = all.map(u => u.id === currentUser.id ? {...u, username: name} : u);
             await CloudService.updateUsers(updated);
             setAuthUser({...currentUser, username: name});
          }} />}
        {currentView === 'chat' && <ChatArea group={groups.find(g => g.id === activeGroupId) || null} messages={messages} currentUser={currentUser} onSendMessage={handleSendMessage} onInvite={() => setModals(m => ({ ...m, invite: true }))} onDeleteGroup={async (gid) => { if(confirm("Delete?")) { await CloudService.deleteGroup(gid, currentUser.id); await syncState(); setActiveGroupId(null); setCurrentView('dashboard'); } }} />}
        {currentView === 'admin-panel' && currentUser.role === 'dev' && <DevAdminPanel onLogout={handleLogout} />}
      </main>
      {modals.create && <CreateGroupModal onClose={() => setModals(m => ({ ...m, create: false }))} onCreate={async (n, d) => { const ng = await CloudService.createGroup(n, d, currentUser.id); await syncState(); setActiveGroupId(ng.id); setCurrentView('chat'); setModals(m => ({ ...m, create: false })); }} />}
      {modals.join && <JoinGroupModal onClose={() => setModals(m => ({ ...m, join: false }))} onJoin={async (c) => { const g = await CloudService.joinGroupByCode(c, currentUser.id); if(g) { await syncState(); setActiveGroupId(g.id); setCurrentView('chat'); setModals(m => ({ ...m, join: false })); } else setModals(m => ({ ...m, error: "Invalid" })); }} error={modals.error || undefined} />}
      {modals.invite && activeGroupId && <InviteModal group={groups.find(g => g.id === activeGroupId)!} onClose={() => setModals(m => ({ ...m, invite: false }))} />}
    </div>
  );
};

export default App;
