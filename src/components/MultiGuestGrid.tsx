import React, { useState, useEffect, useRef } from 'react';
import { RoomGuest, User } from '../types';
import { Mic, MicOff, Video, VideoOff, Plus, Volume2, ShieldAlert, UserX, VolumeX, Hand, X, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

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
  const [hasWebcam, setHasWebcam] = useState(false);

  useEffect(() => {
    let mediaStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let animationFrameId: number | null = null;

    async function setupStream() {
      if (!isVideoOn && !isMicOn) return;

      try {
        if (navigator.mediaDevices?.getUserMedia) {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: isVideoOn,
            audio: isMicOn,
          });

          if (isVideoOn && videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            setHasWebcam(true);
          }

          if (isMicOn && onSpeakingChange) {
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length > 0) {
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              audioContext = new AudioCtx();
              const source = audioContext.createMediaStreamSource(mediaStream);
              const analyser = audioContext.createAnalyser();
              analyser.fftSize = 256;
              source.connect(analyser);

              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              const checkVolume = () => {
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                onSpeakingChange(average > 18);
                animationFrameId = requestAnimationFrame(checkVolume);
              };
              checkVolume();
            }
          }
        }
      } catch (err) {
        console.warn('Local media stream access note:', err);
        setHasWebcam(false);
      }
    }

    setupStream();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (audioContext) audioContext.close();
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isVideoOn, isMicOn, onSpeakingChange]);

  if (isVideoOn && hasWebcam) {
    return (
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
      />
    );
  }

  return null;
};

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
}) => {
  const { user } = useAuth();
  const { remoteMediaStreams } = useSocket();
  const seats = Array.from({ length: 10 }, (_, i) => i + 1);
  const [activeSlotMenu, setActiveSlotMenu] = useState<number | null>(null);
  const [selectedSeatChoice, setSelectedSeatChoice] = useState<number | null>(null);
  const [localSpeakingState, setLocalSpeakingState] = useState<Record<number, boolean>>({});

  const handleSeatClick = (seatNum: number) => {
    const existingGuest = guests.find((g) => g.seatNumber === seatNum);
    if (!existingGuest) {
      setSelectedSeatChoice(seatNum);
    }
  };

  const confirmTakeSeat = (slotType: 'video' | 'audio') => {
    if (selectedSeatChoice !== null) {
      onTakeSeat(selectedSeatChoice, slotType);
      setSelectedSeatChoice(null);
    }
  };

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
      <div className="grid grid-cols-5 gap-2">
        {seats.map((seatNum) => {
          const guest = guests.find((g) => g.seatNumber === seatNum);
          const isMySeat = guest?.user.id === user.id;
          const isSpeakingNow = guest?.isSpeaking || localSpeakingState[seatNum];

          if (!guest) {
            return (
              <button
                key={seatNum}
                onClick={() => handleSeatClick(seatNum)}
                className="group relative flex flex-col items-center justify-center aspect-square rounded-2xl bg-white/[0.03] border border-dashed border-white/15 hover:border-indigo-500/60 hover:bg-indigo-600/10 transition-all p-1"
              >
                <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 group-hover:scale-110 transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[9px] font-extrabold text-slate-400 mt-1">Slot #{seatNum}</span>
              </button>
            );
          }

          return (
            <div
              key={seatNum}
              className={`relative group flex flex-col items-center justify-between aspect-square rounded-2xl p-1 border overflow-hidden transition-all ${
                isSpeakingNow
                  ? 'bg-gradient-to-b from-indigo-950/90 to-purple-950/90 border-pink-500 ring-2 ring-pink-500/60 shadow-lg shadow-pink-500/40'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {/* Webcam Video & Microphone Media Stream */}
              {isMySeat ? (
                <LocalMediaStreamTile
                  isMicOn={guest.isMicOn && !guest.isMutedByHost}
                  isVideoOn={guest.isVideoOn}
                  onSpeakingChange={(speaking) => {
                    setLocalSpeakingState((prev) => ({ ...prev, [seatNum]: speaking }));
                  }}
                />
              ) : remoteMediaStreams.has(guest.user.id) ? (
                <RemoteMediaStreamTile
                  stream={remoteMediaStreams.get(guest.user.id)!.stream}
                  isVideoOn={guest.isVideoOn}
                  isMicOn={guest.isMicOn && !guest.isMutedByHost}
                />
              ) : guest.isVideoOn ? (
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-indigo-950 to-slate-900 opacity-60 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-indigo-400/30 animate-pulse" />
                  <div className="absolute inset-0 bg-black/30" />
                </div>
              ) : null}

              {/* Slot Number & Leave Seat Button */}
              <div className="relative z-10 w-full flex items-center justify-between px-1 pt-0.5">
                <span className="px-1 py-0.2 bg-black/70 backdrop-blur-sm rounded text-[8px] font-black text-indigo-300 border border-white/10">
                  #{seatNum}
                </span>

                {isMySeat && (
                  <button
                    onClick={() => onLeaveSeat(seatNum)}
                    className="p-1 bg-red-600/90 hover:bg-red-600 text-white rounded-full text-[8px] font-bold shadow transition-transform hover:scale-110"
                    title="Leave Stage Slot"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Guest Avatar or Live Badge */}
              <div className="relative z-10 my-0.5">
                {!guest.isVideoOn ? (
                  <div className="relative">
                    <img
                      src={guest.user.avatar}
                      alt={guest.user.name}
                      className={`w-8 h-8 rounded-full object-cover ring-2 ${
                        isSpeakingNow ? 'ring-pink-400 scale-105' : 'ring-indigo-500/40'
                      }`}
                    />
                    {isSpeakingNow && (
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-pink-500 text-white rounded-full text-[8px]">
                        <Volume2 className="w-2.5 h-2.5 animate-pulse" />
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-[10px] font-black px-1.5 py-0.5 bg-indigo-600/80 backdrop-blur-md rounded-full text-white shadow">
                    LIVE
                  </span>
                )}
              </div>

              {/* Guest Name & Controls Footer */}
              <div className="relative z-10 w-full flex flex-col items-center">
                <span className="text-[9px] font-bold text-white truncate max-w-full leading-none mb-1 drop-shadow">
                  {guest.user.name}
                </span>

                {/* Controls for User on Stage */}
                {isMySeat ? (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onToggleMic(seatNum)}
                      className={`p-1 rounded-full text-[8px] font-bold transition-all ${
                        guest.isMicOn && !guest.isMutedByHost ? 'bg-emerald-500 text-white' : 'bg-red-500/80 text-white'
                      }`}
                      title={guest.isMicOn ? 'Mute Mic' : 'Unmute Mic'}
                    >
                      {guest.isMicOn && !guest.isMutedByHost ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                    </button>

                    <button
                      onClick={() => onToggleVideo(seatNum)}
                      className={`p-1 rounded-full text-[8px] font-bold transition-all ${
                        guest.isVideoOn ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                      title={guest.isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
                    >
                      {guest.isVideoOn ? <Video className="w-2.5 h-2.5" /> : <VideoOff className="w-2.5 h-2.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-0.5">
                    {guest.isMutedByHost ? (
                      <span className="text-[7px] text-red-400 font-extrabold bg-red-950/90 border border-red-500/40 px-1 rounded">
                        MUTED
                      </span>
                    ) : guest.isMicOn ? (
                      <Mic className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <MicOff className="w-2.5 h-2.5 text-red-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Host Gear Settings Icon */}
              {isHost && !isMySeat && (
                <button
                  onClick={() => setActiveSlotMenu(activeSlotMenu === seatNum ? null : seatNum)}
                  className="absolute bottom-1 right-1 z-20 p-0.5 bg-black/60 hover:bg-black/90 text-white rounded text-[8px]"
                  title="Host Moderation"
                >
                  ⚙️
                </button>
              )}

              {/* Host Quick Action Dropdown Modal */}
              {isHost && activeSlotMenu === seatNum && (
                <div className="absolute inset-0 z-30 bg-black/95 backdrop-blur-md rounded-2xl p-1 flex flex-col items-center justify-around text-[9px]">
                  <button
                    onClick={() => {
                      onHostToggleMute?.(seatNum);
                      setActiveSlotMenu(null);
                    }}
                    className="w-full py-0.5 bg-yellow-500/20 text-yellow-300 font-bold rounded border border-yellow-500/40"
                  >
                    {guest.isMutedByHost ? 'Unmute' : 'Mute Mic'}
                  </button>
                  <button
                    onClick={() => {
                      onKickGuest?.(seatNum);
                      setActiveSlotMenu(null);
                    }}
                    className="w-full py-0.5 bg-red-500/20 text-red-300 font-bold rounded border border-red-500/40"
                  >
                    Kick
                  </button>
                  <button onClick={() => setActiveSlotMenu(null)} className="text-slate-400 font-bold">
                    Close
                  </button>
                </div>
              )}
            </div>
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
    </div>
  );
};
