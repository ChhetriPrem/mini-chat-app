import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './views/HomeView';
import { LiveStreamView } from './views/LiveStreamView';
import { ReelsView } from './views/ReelsView';
import { MessagesView } from './views/MessagesView';
import { ProfileView } from './views/ProfileView';
import { CreatorDashboardView } from './views/CreatorDashboardView';
import { WalletModal } from './components/modals/WalletModal';
import { GoLiveModal } from './components/modals/GoLiveModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { LeaderboardModal } from './components/modals/LeaderboardModal';
import { SearchModal } from './components/modals/SearchModal';
import { AuthModal } from './components/modals/AuthModal';
import { GiftDrawer } from './components/GiftDrawer';
import { StreamRoom, RoomType } from './types';
import { MOCK_STREAMS, VIRTUAL_GIFTS } from './mockData';

export function MainApp() {
  const [activeTab, setActiveTab] = useState<'home' | 'reel' | 'live' | 'message' | 'profile'>('home');
  const [activeHomeTab, setActiveHomeTab] = useState<'hot' | 'recommend'>('hot');
  const [selectedRoom, setSelectedRoom] = useState<StreamRoom | null>(null);

  // Modals
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isGoLiveOpen, setIsGoLiveOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isReelGiftOpen, setIsReelGiftOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const handleStartStream = (title: string, category: string, type: RoomType) => {
    const customRoom: StreamRoom = {
      id: `room_live_${Date.now()}`,
      title,
      type,
      category,
      country: 'India',
      countryFlag: '🇮🇳',
      coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
      viewerCount: 1,
      likeCount: 0,
      tags: ['Live', category],
      isHot: true,
      isRecommended: true,
      durationSeconds: 0,
      pinnedMessage: `Welcome everyone to ${title}! 👋`,
      host: MOCK_STREAMS[0].host,
      guests: []
    };
    setSelectedRoom(customRoom);
  };

  return (
    <div className="bg-[#0a0518] min-h-screen text-white font-sans selection:bg-pink-500 selection:text-white">
      {/* Phone Canvas Container Frame */}
      <div className="max-w-md mx-auto min-h-screen relative bg-[#0f0826] shadow-2xl border-x border-white/5 overflow-x-hidden">
        {/* Top Sticky Header (shown on Home view) */}
        {activeTab === 'home' && !selectedRoom && (
          <Header
            activeHomeTab={activeHomeTab}
            setActiveHomeTab={setActiveHomeTab}
            onSearchClick={() => setIsSearchOpen(true)}
            onLeaderboardClick={() => setIsLeaderboardOpen(true)}
            onWalletClick={() => setIsWalletOpen(true)}
            onNotificationsClick={() => setIsNotificationsOpen(true)}
            onSettingsClick={() => setIsSettingsOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {/* Views Router */}
        {activeTab === 'home' && (
          <HomeView
            activeHomeTab={activeHomeTab}
            onSelectRoom={(room) => setSelectedRoom(room)}
            onGoLiveClick={() => setIsGoLiveOpen(true)}
          />
        )}

        {activeTab === 'reel' && (
          <ReelsView onOpenGiftDrawer={() => setIsReelGiftOpen(true)} />
        )}

        {activeTab === 'message' && <MessagesView />}

        {activeTab === 'profile' && (
          <ProfileView
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenCreatorDashboard={() => setActiveTab('live')}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'live' && (
          <CreatorDashboardView onGoLiveClick={() => setIsGoLiveOpen(true)} />
        )}

        {/* Bottom Fixed Navigation Bar */}
        {!selectedRoom && (
          <BottomNav
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onGoLiveClick={() => setIsGoLiveOpen(true)}
          />
        )}

        {/* Active Live Stream Room Overlay Screen */}
        {selectedRoom && (
          <LiveStreamView
            room={selectedRoom}
            onClose={() => setSelectedRoom(null)}
            onOpenWallet={() => setIsWalletOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {/* Global Modals */}
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
        <GoLiveModal
          isOpen={isGoLiveOpen}
          onClose={() => setIsGoLiveOpen(false)}
          onStartStream={handleStartStream}
        />
        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
        />
        <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        <LeaderboardModal isOpen={isLeaderboardOpen} onClose={() => setIsLeaderboardOpen(false)} />
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onSelectRoom={(room) => setSelectedRoom(room)}
        />

        <GiftDrawer
          isOpen={isReelGiftOpen}
          onClose={() => setIsReelGiftOpen(false)}
          onSendGift={(_gift, _count) => setIsReelGiftOpen(false)}
          onOpenWallet={() => setIsWalletOpen(true)}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainApp />
      </SocketProvider>
    </AuthProvider>
  );
}
