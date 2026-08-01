import React, { useState, useEffect, useRef } from 'react';
import { StreamRoom } from '../types';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { GiftAnimationOverlay } from '../components/GiftAnimationOverlay';
import { GiftDrawer } from '../components/GiftDrawer';
import { ChatOverlay } from '../components/ChatOverlay';
import { MultiGuestGrid } from '../components/MultiGuestGrid';
import { DrawAndGuessGame } from '../components/games/DrawAndGuessGame';
import { TriviaGame } from '../components/games/TriviaGame';
import { RockPaperScissorsGame } from '../components/games/RockPaperScissorsGame';
import { StageRequestsModal } from '../components/modals/StageRequestsModal';
import {
  X,
  Gift,
  Share2,
  Gamepad2,
  Users,
  Camera,
  UserPlus,
  Check,
  Hand,
  ChevronDown,
  ChevronUp,
  Radio,
  Sparkles
} from 'lucide-react';

interface LiveStreamViewProps {
  room: StreamRoom;
  onClose: () => void;
  onOpenWallet: () => void;
  onOpenAuth?: () => void;
}

export const LiveStreamView: React.FC<LiveStreamViewProps> = ({
  room,
  onClose,
  onOpenWallet,
  onOpenAuth,
}) => {
  const { user, followingIds, toggleFollow } = useAuth();
  const {
    joinRoom,
    leaveRoom,
    sendChatMessage,
    sendVirtualGift,
    sendEmojiReaction,
    takeSeat,
    leaveSeat,
    toggleMic,
    toggleVideo,
    kickGuest,
    hostToggleMute,
    requestStageSlot,
    cancelStageRequest,
    approveStageRequest,
    chatMessages,
    floatingGifts,
    floatingEmojis,
    currentViewerCount,
    guestSeats,
    stageRequests,
  } = useSocket();

  const [isGiftDrawerOpen, setIsGiftDrawerOpen] = useState(false);
  const [isStageQueueModalOpen, setIsStageQueueModalOpen] = useState(false);
  const [activeGame, setActiveGame] = useState<'draw' | 'trivia' | 'rps' | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showStageGrid, setShowStageGrid] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    joinRoom(room.id);
    return () => {
      leaveRoom();
    };
  }, [room.id]);

  const isHost = room.host.id === user.id;
  const isFollowingHost = followingIds.has(room.host.id);
  const myRequestPending = stageRequests.some((sr) => sr.user.id === user.id);

  // Toggle user camera for WebRTC / live video broadcast
  const toggleCameraFeed = async () => {
    if (isCameraActive) {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setIsCameraActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
      } catch (err) {
        alert('Could not access camera/microphone or permission denied.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#050507] text-white flex flex-col justify-between overflow-hidden max-w-md mx-auto shadow-2xl">
      {/* Background Video Stream Layer */}
      <div className="absolute inset-0 z-0 bg-[#050507]">
        {isCameraActive ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={room.coverImage}
              alt={room.title}
              className="w-full h-full object-cover filter brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-[#050507]" />
          </div>
        )}
      </div>

      {/* Floating Gifts & Particle Animations */}
      <GiftAnimationOverlay floatingGifts={floatingGifts} floatingEmojis={floatingEmojis} />

      {/* TOP HEADER OVERLAY */}
      <div className="relative z-20 p-3 flex flex-col space-y-2 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
        <div className="flex items-center justify-between">
          {/* Host Info Pill */}
          <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md p-1 pr-3 rounded-full border border-white/10">
            <img
              src={room.host.avatar}
              alt={room.host.name}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500"
            />
            <div className="flex flex-col">
              <span className="text-xs font-black text-white truncate max-w-[100px]">{room.host.name}</span>
              <span className="text-[9px] text-yellow-300 font-bold flex items-center">
                💎 {room.host.diamonds.toLocaleString()}
              </span>
            </div>

            {/* Follow Button */}
            {!isHost && (
              <button
                onClick={() => toggleFollow(room.host.id)}
                className={`ml-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all flex items-center space-x-0.5 ${
                  isFollowingHost
                    ? 'bg-white/20 text-slate-300'
                    : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-md'
                }`}
              >
                {isFollowingHost ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3 h-3" />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-2">
            {/* Live Audience Viewer Pill (Showing 100 Viewers) */}
            <div className="flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/15 text-xs font-black text-white">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{currentViewerCount.toLocaleString()} in room</span>
            </div>

            {/* Camera Feed Toggle */}
            <button
              onClick={toggleCameraFeed}
              className={`p-2 rounded-full border transition-all ${
                isCameraActive ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/50' : 'bg-black/60 text-slate-300 border-white/15'
              }`}
              title="Toggle Live Camera"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Switch Persona / Account Button */}
            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="p-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-full border border-indigo-400/50 transition-all flex items-center space-x-1"
                title="Switch User Persona"
              >
                <img src={user.avatar} className="w-5 h-5 rounded-full object-cover" />
              </button>
            )}

            {/* Close Room Button */}
            <button
              onClick={onClose}
              className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full border border-white/15 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stage Status & Request Bar */}
        <div className="flex items-center justify-between bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
          <div className="flex items-center space-x-2 text-[11px] font-bold">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-200">
              Stage: <strong className="text-indigo-400">{guestSeats.length}/10 Slots</strong> Occupied
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Toggle Stage Grid View */}
            <button
              onClick={() => setShowStageGrid(!showStageGrid)}
              className="px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-extrabold text-slate-300 flex items-center space-x-1"
            >
              <span>{showStageGrid ? 'Hide Stage' : 'Show Stage'}</span>
              {showStageGrid ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Stage Queue / Request Button */}
            <button
              onClick={() => setIsStageQueueModalOpen(true)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center space-x-1 transition-all ${
                stageRequests.length > 0 && isHost
                  ? 'bg-yellow-500 text-black animate-pulse shadow-lg'
                  : 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/50'
              }`}
            >
              <Hand className="w-3 h-3" />
              <span>{isHost ? `Queue (${stageRequests.length})` : 'Request Slot'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION (10 Stage Slots or Interactive Games Launcher) */}
      <div className="relative z-20 px-3 my-auto space-y-3 pointer-events-auto max-h-[50vh] overflow-y-auto">
        {/* Active Room Mini Game */}
        {activeGame === 'draw' && <DrawAndGuessGame />}
        {activeGame === 'trivia' && <TriviaGame />}
        {activeGame === 'rps' && <RockPaperScissorsGame />}

        {/* 10 Dedicated Stage Seats Grid */}
        {showStageGrid && !activeGame && (
          <MultiGuestGrid
            guests={guestSeats}
            host={room.host}
            onTakeSeat={takeSeat}
            onLeaveSeat={leaveSeat}
            onToggleMic={toggleMic}
            onToggleVideo={toggleVideo}
            onKickGuest={kickGuest}
            onHostToggleMute={hostToggleMute}
            onRequestSlot={requestStageSlot}
            isHost={isHost}
          />
        )}
      </div>

      {/* BOTTOM CHAT & ROOM GAME TOOLBAR OVERLAY */}
      <div className="relative z-20 p-3 space-y-3 bg-gradient-to-t from-[#050507] via-[#050507]/90 to-transparent">
        {/* Live Audience Chat Box */}
        <div className="h-44">
          <ChatOverlay
            messages={chatMessages}
            pinnedMessage={room.pinnedMessage}
            onSendMessage={sendChatMessage}
            onSendEmojiReaction={sendEmojiReaction}
          />
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between pt-1">
          {/* Room Games Launcher Bar */}
          <div className="flex items-center space-x-1 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black text-slate-400 pl-1">Room Games:</span>
            <button
              onClick={() => setActiveGame(activeGame === 'draw' ? null : 'draw')}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all flex items-center space-x-1 ${
                activeGame === 'draw'
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 text-pink-400" />
              <span>Draw</span>
            </button>

            <button
              onClick={() => setActiveGame(activeGame === 'trivia' ? null : 'trivia')}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
                activeGame === 'trivia'
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <span>❓ Trivia</span>
            </button>

            <button
              onClick={() => setActiveGame(activeGame === 'rps' ? null : 'rps')}
              className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all ${
                activeGame === 'rps'
                  ? 'bg-gradient-to-r from-indigo-600 to-pink-500 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <span>✂️ RPS</span>
            </button>
          </div>

          {/* Right Action Icons (Gift & Share) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: room.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Stream room link copied to clipboard!');
                }
              }}
              className="p-2.5 bg-black/60 hover:bg-black/80 rounded-full border border-white/15 text-slate-200 transition-all"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {/* Gift Drawer Trigger Button */}
            <button
              onClick={() => setIsGiftDrawerOpen(true)}
              className="relative p-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-full shadow-lg shadow-pink-500/30 hover:scale-110 active:scale-95 transition-transform"
            >
              <Gift className="w-5 h-5 animate-bounce" />
            </button>
          </div>
        </div>
      </div>

      {/* Stage Requests Modal */}
      <StageRequestsModal
        isOpen={isStageQueueModalOpen}
        onClose={() => setIsStageQueueModalOpen(false)}
        requests={stageRequests}
        onApproveRequest={(reqId) => {
          approveStageRequest(reqId);
          setIsStageQueueModalOpen(false);
        }}
        isHost={isHost}
        onRequestSlot={(slotType) => {
          requestStageSlot(slotType);
          setIsStageQueueModalOpen(false);
        }}
        myRequestPending={myRequestPending}
      />

      {/* Virtual Gift Drawer Sheet */}
      <GiftDrawer
        isOpen={isGiftDrawerOpen}
        onClose={() => setIsGiftDrawerOpen(false)}
        onSendGift={(gift, count) => {
          sendVirtualGift(gift, count);
          setIsGiftDrawerOpen(false);
        }}
        onOpenWallet={onOpenWallet}
      />
    </div>
  );
};
