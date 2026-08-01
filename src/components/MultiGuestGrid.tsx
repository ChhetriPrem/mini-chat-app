import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoomGuest, User } from '../types';
import { Mic, MicOff, Video, VideoOff, Plus, Volume2, ShieldAlert, UserX, VolumeX, Hand, X, Camera, Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { sfuManager } from '../lib/sfuManager';

interface MultiGuestGridProps {
  guests: RoomGuest[];
  host: User;
  onTakeSeat: (seatNumber: number, slotType?: 'video' | 'audio') => void;
  onLeaveSeat: (seatNumber: number) => void;
  onToggleMic: (seatNumber: number) => void;
  onToggleVideo: (seatNumber: number) => void;
  onKickGuest?: (seatNumber: number) => void;
  onHostToggleMute?: (seatNumber: number) => void;
  onRequestSlot?: (slotType: 'video' | 'audio') => void;
  isHost?: boolean;
  isAudioRoom?: boolean;
}

const RemoteMediaStreamTile: React.FC<{
  stream: MediaStream;
  isVideoOn: boolean;
  isMicOn: boolean;
}> = ({ stream, isVideoOn }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, isVideoOn]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="absolute inset-0 w-full h-full object-cover rounded-2xl z-0"
    />
  );
};

const LocalMediaStreamTile: React.FC<{
  isMicOn: boolean;
  isVideoOn: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}> = ({ isMicOn, isVideoOn, onSpeakingChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let intervalId: any = null;
    let lastSpoke = false;

    async function bindStream() {
      let mediaStream = sfuManager.getLocalMediaStream();
      const hasLiveVideo = mediaStream && mediaStream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);

      if ((!mediaStream || (isVideoOn && !hasLiveVideo)) && (isVideoOn || isMicOn)) {
        mediaStream = await sfuManager.getLocalStream(isVideoOn, isMicOn);
      }

      if (videoRef.current && mediaStream) {
        if (videoRef.current.srcObject !== mediaStream) {
          videoRef.current.srcObject = mediaStream;
        }
        if (isVideoOn) {
          videoRef.current.play().catch(() => {});
        }
      }

      if (mediaStream && isMicOn && onSpeakingChange) {
        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length > 0) {
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            audioContext = new AudioCtx();
            const source = audioContext.createMediaStreamSource(mediaStream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            intervalId = setInterval(() => {
              analyser.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              const isSpeaking = average > 18;
              if (isSpeaking !== lastSpoke) {
                lastSpoke = isSpeaking;
                onSpeakingChange(isSpeaking);
              }
            }, 150);
          } catch (e) {
            console.warn('Audio analyzer error:', e);
          }
        }
      }
    }

    bindStream();

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioContext) audioContext.close();
    };
  }, [isVideoOn, isMicOn, onSpeakingChange]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`absolute inset-0 w-full h-full object-cover rounded-2xl z-0 ${isVideoOn ? 'block' : 'hidden'}`}
    />
  );
};

interface SeatTileProps {
  seatNum: number;
  guest?: RoomGuest;
  isMySeat: boolean;
  isSpeakingNow: boolean;
  remoteStream?: MediaStream;
  isHost: boolean;
  activeSlotMenu: number | null;
  handleSeatClick: (seatNum: number) => void;
  onLeaveSeat: (seatNum: number) => void;
  onToggleMic: (seatNum: number) => void;
  onToggleVideo: (seatNum: number) => void;
  onSpeakingChange: (seatNum: number, speaking: boolean) => void;
  onSpotlight: (guest: RoomGuest, isLocal: boolean, stream?: MediaStream) => void;
  setActiveSlotMenu: React.Dispatch<React.SetStateAction<number | null>>;
  onHostToggleMute?: (seatNum: number) => void;
  onKickGuest?: (seatNum: number) => void;
  isAudioRoom?: boolean;
}

const SeatTile = React.memo<SeatTileProps>(({
  seatNum,
  guest,
  isMySeat,
  isSpeakingNow,
  remoteStream,
  isHost,
  activeSlotMenu,
  handleSeatClick,
  onLeaveSeat,
  onToggleMic,
  onToggleVideo,
  onSpeakingChange,
  onSpotlight,
  setActiveSlotMenu,
  onHostToggleMute,
  onKickGuest,
  isAudioRoom = false,
}) => {
  const [showTapOverlay, setShowTapOverlay] = useState(false);

  if (!guest) {
    return (
      <button
        onClick={() => handleSeatClick(seatNum)}
        className="group relative flex flex-col items-center justify-center aspect-square rounded-2xl bg-white/[0.04] border border-dashed border-white/15 hover:border-indigo-400 hover:bg-indigo-600/10 transition-all p-1 active:scale-95"
      >
        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-indigo-300 transition-all">
          <Plus className="w-3.5 h-3.5" />
        </div>
        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 mt-0.5">#{seatNum}</span>
      </button>
    );
  }

  return (
    <div
      onClick={() => !isMySeat && setShowTapOverlay((prev) => !prev)}
      className={`relative group flex flex-col items-center justify-between aspect-square rounded-2xl border overflow-hidden transition-all duration-300 shadow-md cursor-pointer ${
        isSpeakingNow
          ? 'bg-indigo-950/90 border-pink-500 ring-2 ring-pink-500/60 shadow-pink-500/30'
          : 'bg-slate-950/90 border-white/15'
      }`}
    >
      {/* Webcam Video & Microphone Media Stream */}
      {isMySeat ? (
        <LocalMediaStreamTile
          isMicOn={guest.isMicOn && !guest.isMutedByHost}
          isVideoOn={guest.isVideoOn}
          onSpeakingChange={(speaking) => onSpeakingChange(seatNum, speaking)}
        />
      ) : remoteStream ? (
        <RemoteMediaStreamTile
          stream={remoteStream}
          isVideoOn={guest.isVideoOn}
          isMicOn={guest.isMicOn && !guest.isMutedByHost}
        />
      ) : guest.isVideoOn ? (
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-indigo-950 to-slate-900 opacity-60 flex items-center justify-center">
          <Camera className="w-6 h-6 text-indigo-400/30 animate-pulse" />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      ) : (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-indigo-950/40">
          <img src={guest.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover opacity-50 blur-xs" />
        </div>
      )}

      {/* OVERLAY: Always visible controls in compact format */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between p-1 bg-gradient-to-t from-black/85 via-black/20 to-black/60 pointer-events-auto">
        {/* Header: Slot #, Spotlight & Leave Stage Button */}
        <div className="w-full flex items-center justify-between">
          <span className="px-1 py-0.2 bg-black/70 rounded text-[8px] font-black text-indigo-300 border border-white/10">
            #{seatNum}
          </span>

          {isMySeat ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLeaveSeat(seatNum);
              }}
              className="p-1 bg-red-600 hover:bg-red-500 text-white rounded-full text-[8px] font-bold shadow transition-transform active:scale-95 flex items-center justify-center"
              title="Leave Stage Seat"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const localStream = sfuManager.getLocalMediaStream() || undefined;
                onSpotlight(guest, isMySeat, isMySeat ? localStream : remoteStream);
              }}
              className="p-1 bg-black/60 hover:bg-black text-white rounded-md border border-white/20 shadow"
              title="Spotlight"
            >
              <Maximize2 className="w-2.5 h-2.5 text-indigo-300" />
            </button>
          )}
        </div>

        {/* Center: Guest Avatar & Speaking indicator */}
        <div className="my-auto relative flex flex-col items-center">
          <img
            src={guest.user.avatar}
            alt={guest.user.name}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover ring-2 ${
              isSpeakingNow ? 'ring-pink-400 scale-105 shadow-md shadow-pink-500/50' : 'ring-indigo-500/60'
            }`}
          />
          {isSpeakingNow && (
            <span className="absolute -bottom-1 -right-1 p-0.5 bg-pink-500 text-white rounded-full shadow">
              <Volume2 className="w-2.5 h-2.5 animate-pulse" />
            </span>
          )}
        </div>

        {/* Footer: User Info & Controls */}
        <div className="w-full flex items-center justify-between bg-black/70 px-1 py-0.5 rounded-full border border-white/10">
          <span className="text-[8px] font-bold text-white truncate max-w-[42px]">
            {guest.user.name}
          </span>

          {isMySeat ? (
            <div className="flex items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMic(seatNum);
                }}
                className={`p-0.5 rounded-full text-white ${
                  guest.isMicOn && !guest.isMutedByHost ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                title={guest.isMicOn ? 'Mute' : 'Unmute'}
              >
                {guest.isMicOn && !guest.isMutedByHost ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
              </button>
            </div>
          ) : (
            <span className={guest.isMicOn && !guest.isMutedByHost ? 'text-emerald-400' : 'text-red-400'}>
              {guest.isMicOn && !guest.isMutedByHost ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
            </span>
          )}
        </div>

        {/* Host Gear Settings Icon */}
        {isHost && !isMySeat && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveSlotMenu(activeSlotMenu === seatNum ? null : seatNum);
            }}
            className="absolute top-1 right-1 z-20 p-0.5 bg-black/80 hover:bg-black text-white rounded text-[8px] border border-white/20 shadow"
            title="Host Moderation"
          >
            ⚙️
          </button>
        )}
      </div>

      {/* Host Quick Action Dropdown Modal */}
      {isHost && activeSlotMenu === seatNum && (
        <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-md rounded-2xl p-3 flex flex-col items-center justify-center space-y-2 text-xs">
          <span className="font-extrabold text-white text-[10px]">Moderate {guest.user.name}</span>
          <button
            onClick={() => {
              onHostToggleMute?.(seatNum);
              setActiveSlotMenu(null);
            }}
            className="w-full py-1 bg-yellow-500/20 text-yellow-300 font-bold rounded-lg border border-yellow-500/40 hover:bg-yellow-500/30"
          >
            {guest.isMutedByHost ? 'Unmute Mic' : 'Mute Guest Mic'}
          </button>
          <button
            onClick={() => {
              onKickGuest?.(seatNum);
              setActiveSlotMenu(null);
            }}
            className="w-full py-1 bg-red-500/20 text-red-300 font-bold rounded-lg border border-red-500/40 hover:bg-red-500/30"
          >
            Kick from Stage
          </button>
          <button onClick={() => setActiveSlotMenu(null)} className="text-slate-400 text-[10px] font-bold pt-1">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
});

export const MultiGuestGrid: React.FC<MultiGuestGridProps> = ({
  guests,
  host,
  onTakeSeat,
  onLeaveSeat,
  onToggleMic,
  onToggleVideo,
  onKickGuest,
  onHostToggleMute,
  onRequestSlot,
  isHost = false,
  isAudioRoom = false,
}) => {
  const { user } = useAuth();
  const { remoteMediaStreams } = useSocket();
  const seats = Array.from({ length: 10 }, (_, i) => i + 1);
  const [activeSlotMenu, setActiveSlotMenu] = useState<number | null>(null);
  const [selectedSeatChoice, setSelectedSeatChoice] = useState<number | null>(null);
  const [localSpeakingState, setLocalSpeakingState] = useState<Record<number, boolean>>({});
  const [spotlightTarget, setSpotlightTarget] = useState<{ guest: RoomGuest; isLocal: boolean; stream?: MediaStream } | null>(null);

  const handleSeatClick = useCallback((seatNum: number) => {
    const existingGuest = guests.find((g) => g.seatNumber === seatNum);
    if (!existingGuest) {
      if (isAudioRoom) {
        onTakeSeat(seatNum, 'audio');
      } else {
        setSelectedSeatChoice(seatNum);
      }
    }
  }, [guests, isAudioRoom, onTakeSeat]);

  const confirmTakeSeat = (slotType: 'video' | 'audio') => {
    if (selectedSeatChoice !== null) {
      onTakeSeat(selectedSeatChoice, isAudioRoom ? 'audio' : slotType);
      setSelectedSeatChoice(null);
    }
  };

  const handleSpeakingChange = useCallback((seatNum: number, speaking: boolean) => {
    setLocalSpeakingState((prev) => ({ ...prev, [seatNum]: speaking }));
  }, []);

  const handleSpotlight = useCallback((guest: RoomGuest, isLocal: boolean, stream?: MediaStream) => {
    setSpotlightTarget({ guest, isLocal, stream });
  }, []);

  return (
    <div className="bg-[#08080c]/90 border border-white/10 backdrop-blur-xl rounded-3xl p-3 shadow-2xl space-y-2 relative">
      {/* Stage Capacity Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-xs font-black text-white uppercase tracking-wider">
            Live Stage <span className="text-indigo-400">({guests.length}/10 Slots)</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-bold">
          <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300">
            Admin Controlled Stage
          </span>
        </div>
      </div>

      {/* 10 Slots Grid (5 columns x 2 rows) */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {seats.map((seatNum) => {
          const guest = guests.find((g) => g.seatNumber === seatNum);
          const isMySeat = guest?.user.id === user.id;
          const isSpeakingNow = !!(guest?.isSpeaking || localSpeakingState[seatNum]);
          const remoteStream = guest ? remoteMediaStreams.get(guest.user.id)?.stream : undefined;

          return (
            <SeatTile
              key={seatNum}
              seatNum={seatNum}
              guest={guest}
              isMySeat={isMySeat}
              isSpeakingNow={isSpeakingNow}
              remoteStream={remoteStream}
              isHost={isHost}
              activeSlotMenu={activeSlotMenu}
              handleSeatClick={handleSeatClick}
              onLeaveSeat={onLeaveSeat}
              onToggleMic={onToggleMic}
              onToggleVideo={onToggleVideo}
              onSpeakingChange={handleSpeakingChange}
              onSpotlight={handleSpotlight}
              setActiveSlotMenu={setActiveSlotMenu}
              onHostToggleMute={onHostToggleMute}
              onKickGuest={onKickGuest}
              isAudioRoom={isAudioRoom}
            />
          );
        })}
      </div>

      {/* Seat Type Selection Modal */}
      {selectedSeatChoice !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs bg-[#08080c] border border-indigo-500/30 rounded-3xl p-5 text-center space-y-4 shadow-2xl text-white">
            <h3 className="text-sm font-black text-white">Join Stage Slot #{selectedSeatChoice}</h3>
            <p className="text-xs text-slate-400">Choose how you want to present on the live stage:</p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => confirmTakeSeat('video')}
                className="flex flex-col items-center p-3 bg-gradient-to-b from-indigo-600 to-purple-700 rounded-2xl border border-indigo-400/40 hover:scale-105 transition-transform"
              >
                <Video className="w-6 h-6 text-white mb-1" />
                <span className="text-xs font-black text-white">Video Chat</span>
                <span className="text-[9px] text-indigo-200">Camera & Mic</span>
              </button>

              <button
                onClick={() => confirmTakeSeat('audio')}
                className="flex flex-col items-center p-3 bg-white/5 border border-white/15 rounded-2xl hover:bg-white/10 hover:scale-105 transition-transform"
              >
                <Mic className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-xs font-black text-white">Audio Seat</span>
                <span className="text-[9px] text-slate-400">Mic Only</span>
              </button>
            </div>

            <button
              onClick={() => setSelectedSeatChoice(null)}
              className="text-xs font-bold text-slate-400 hover:text-white pt-2 block mx-auto"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen / Spotlight Stream Modal */}
      {spotlightTarget && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Fullscreen Header */}
          <div className="w-full max-w-5xl flex items-center justify-between bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/15 shadow-2xl">
            <div className="flex items-center space-x-3">
              <img
                src={spotlightTarget.guest.user.avatar}
                alt={spotlightTarget.guest.user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500 shadow"
              />
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-black text-white text-base">{spotlightTarget.guest.user.name}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-indigo-600 rounded-full text-white shadow">
                    Slot #{spotlightTarget.guest.seatNumber}
                  </span>
                </div>
                <span className="text-xs text-indigo-300 font-medium">
                  {spotlightTarget.isLocal ? 'Your Live Webcam Feed' : 'Stage Guest Live Stream'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSpotlightTarget(null)}
              className="p-2 bg-white/15 hover:bg-white/25 text-white rounded-full transition-transform hover:scale-105 shadow"
              title="Exit Fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fullscreen Video Content */}
          <div className="relative w-full max-w-5xl flex-1 my-4 bg-slate-950 rounded-3xl border border-white/15 overflow-hidden flex items-center justify-center shadow-2xl">
            {spotlightTarget.isLocal ? (
              <LocalMediaStreamTile
                isMicOn={spotlightTarget.guest.isMicOn && !spotlightTarget.guest.isMutedByHost}
                isVideoOn={spotlightTarget.guest.isVideoOn}
              />
            ) : spotlightTarget.stream ? (
              <RemoteMediaStreamTile
                stream={spotlightTarget.stream}
                isVideoOn={spotlightTarget.guest.isVideoOn}
                isMicOn={spotlightTarget.guest.isMicOn && !spotlightTarget.guest.isMutedByHost}
              />
            ) : spotlightTarget.guest.isVideoOn ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Camera className="w-16 h-16 text-indigo-400/40 animate-pulse" />
                <span className="text-sm text-indigo-300 font-semibold">Connecting High Quality Video Feed...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                <img
                  src={spotlightTarget.guest.user.avatar}
                  alt=""
                  className="w-32 h-32 rounded-full object-cover ring-4 ring-indigo-500/50 shadow-2xl"
                />
                <span className="text-xl font-black text-white">{spotlightTarget.guest.user.name}</span>
                <span className="text-xs text-slate-400 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                  Microphone Seat Active
                </span>
              </div>
            )}
          </div>

          {/* Fullscreen Footer Controls */}
          <div className="w-full max-w-5xl flex items-center justify-center space-x-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/15">
            {spotlightTarget.isLocal && (
              <>
                <button
                  onClick={() => onToggleMic(spotlightTarget.guest.seatNumber)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black shadow transition-all ${
                    spotlightTarget.guest.isMicOn ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {spotlightTarget.guest.isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  <span>{spotlightTarget.guest.isMicOn ? 'Mute Mic' : 'Unmute Mic'}</span>
                </button>

                {!isAudioRoom && (
                  <button
                    onClick={() => onToggleVideo(spotlightTarget.guest.seatNumber)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black shadow transition-all ${
                      spotlightTarget.guest.isVideoOn ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {spotlightTarget.guest.isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    <span>{spotlightTarget.guest.isVideoOn ? 'Camera On' : 'Camera Off'}</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={() => setSpotlightTarget(null)}
              className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-black shadow transition-all"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Exit Fullscreen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
