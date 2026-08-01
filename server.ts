import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import { CURRENT_USER, MOCK_STREAMS, VIRTUAL_GIFTS, MOCK_REELS, MOCK_NOTIFICATIONS } from './src/mockData';
import { StreamRoom, User, ChatMessage, VirtualGift, RoomGuest } from './src/types';

const app = express();
app.use(express.json());

const PORT = 3000;
const server = http.createServer(app);

// Initialize Gemini API client lazily / safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
      try {
        aiClient = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('Failed to initialize Gemini AI client:', err);
      }
    }
  }
  return aiClient;
}

// In-Memory Data Store for Server State
let roomsStore: StreamRoom[] = [...MOCK_STREAMS];
let currentUserStore: User = { ...CURRENT_USER };
let reelsStore = [...MOCK_REELS];
let notificationsStore = [...MOCK_NOTIFICATIONS];

// Active WebSocket Room connections
interface ClientConnection {
  ws: WebSocket;
  userId: string;
  userName: string;
  roomId?: string;
}

const activeClients = new Set<ClientConnection>();

// Setup WebSocket Server
const wss = new WebSocketServer({ server });

function broadcastToRoom(roomId: string, messageObj: any, excludeWs?: WebSocket) {
  const jsonString = JSON.stringify(messageObj);
  for (const client of activeClients) {
    if (client.roomId === roomId && client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      client.ws.send(jsonString);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const conn: ClientConnection = {
    ws,
    userId: `user_${Math.random().toString(36).substring(2, 9)}`,
    userName: 'Anonymous'
  };
  activeClients.add(conn);

  ws.on('message', async (rawMessage) => {
    try {
      const data = JSON.parse(rawMessage.toString());

      switch (data.type) {
        case 'join-room': {
          conn.roomId = data.roomId;
          conn.userId = data.user?.id || conn.userId;
          conn.userName = data.user?.name || conn.userName;

          // Find room and increment viewer count
          const room = roomsStore.find((r) => r.id === data.roomId);
          if (room) {
            room.viewerCount += 1;
            // Broadcast system message
            broadcastToRoom(data.roomId, {
              type: 'system-message',
              content: `✨ ${conn.userName} entered the room!`,
              viewerCount: room.viewerCount,
            });
          }
          break;
        }

        case 'leave-room': {
          if (conn.roomId) {
            const room = roomsStore.find((r) => r.id === conn.roomId);
            if (room && room.viewerCount > 0) {
              room.viewerCount -= 1;
            }
            broadcastToRoom(conn.roomId, {
              type: 'viewer-count-update',
              viewerCount: room ? room.viewerCount : 0,
            });
            conn.roomId = undefined;
          }
          break;
        }

        case 'chat-message': {
          if (!conn.roomId) break;
          const msg: ChatMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            roomId: conn.roomId,
            sender: data.sender || {
              id: conn.userId,
              name: conn.userName,
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
              level: 10,
              vipLevel: 1,
              svip: false,
              country: 'India',
              countryFlag: '🇮🇳',
              followers: 100,
              following: 50,
              friends: 20,
              visitors: 100,
              coins: 500,
              diamonds: 1000,
              bio: 'User',
              handle: conn.userName.toLowerCase(),
              isVerified: false
            },
            content: data.content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          broadcastToRoom(conn.roomId, {
            type: 'chat-message',
            message: msg
          });

          // Check for AI Assistant prompt command (e.g. "@AI", "!ai")
          if (data.content.startsWith('@AI') || data.content.startsWith('!ai')) {
            const prompt = data.content.replace(/^(@AI|!ai)\s*/i, '');
            const gemini = getGeminiClient();
            if (gemini) {
              try {
                const response = await gemini.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: `You are VibeBot, an enthusiastic live stream AI co-host on a popular video/voice app. Reply concisely (1-2 sentences max) to this viewer comment: "${prompt}"`,
                });
                const aiReply = response.text?.trim() || '🔥 Let\'s get this stream hype going!';
                
                const aiMsg: ChatMessage = {
                  id: `ai_msg_${Date.now()}`,
                  roomId: conn.roomId,
                  sender: {
                    id: 'usr_aibot',
                    name: '🤖 VibeBot AI Co-Host',
                    handle: 'vibebot_ai',
                    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200',
                    level: 99,
                    vipLevel: 9,
                    svip: true,
                    country: 'Global',
                    countryFlag: '🌐',
                    isVerified: true,
                    bio: 'Official Stream Co-Host',
                    followers: 999999,
                    following: 0,
                    friends: 999,
                    visitors: 500000,
                    coins: 999999,
                    diamonds: 999999
                  },
                  content: aiReply,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };

                setTimeout(() => {
                  broadcastToRoom(conn.roomId!, {
                    type: 'chat-message',
                    message: aiMsg
                  });
                }, 800);
              } catch (err) {
                console.error('Gemini AI error:', err);
              }
            }
          }
          break;
        }

        case 'send-gift': {
          if (!conn.roomId) break;
          const gift: VirtualGift = data.gift;
          const count: number = data.count || 1;
          const totalCoins = gift.priceCoins * count;

          // Deduct coins from sender if current user
          if (conn.userId === currentUserStore.id) {
            currentUserStore.coins = Math.max(0, currentUserStore.coins - totalCoins);
          }

          // Add diamonds to room host
          const room = roomsStore.find((r) => r.id === conn.roomId);
          if (room) {
            room.host.diamonds += Math.floor(totalCoins * 0.7);
          }

          const giftMsg: ChatMessage = {
            id: `gift_msg_${Date.now()}`,
            roomId: conn.roomId,
            sender: data.sender || currentUserStore,
            content: `sent ${gift.name} x${count} ${gift.icon}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isGift: true,
            giftData: {
              giftId: gift.id,
              giftName: gift.name,
              giftIcon: gift.icon,
              count: count,
              valueCoins: gift.priceCoins
            }
          };

          broadcastToRoom(conn.roomId, {
            type: 'send-gift',
            gift,
            count,
            sender: data.sender || currentUserStore,
            message: giftMsg,
            updatedCoins: currentUserStore.coins,
          });
          break;
        }

        case 'emoji-reaction': {
          if (!conn.roomId) break;
          broadcastToRoom(conn.roomId, {
            type: 'emoji-reaction',
            emoji: data.emoji || '❤️',
            senderName: conn.userName,
          });
          break;
        }

        case 'seat-action': {
          if (!conn.roomId) break;
          const room = roomsStore.find((r) => r.id === conn.roomId);
          if (room) {
            if (!room.guests) room.guests = [];
            if (!room.stageRequests) room.stageRequests = [];

            if (data.action === 'take') {
              const targetUserId = data.user?.id || conn.userId;

              // Remove user from any existing seat in this room first (single seat policy per user)
              room.guests = room.guests.filter((g) => g.user.id !== targetUserId && g.seatNumber !== data.seatNumber);

              // Ensure maximum 10 seats
              if (room.guests.length >= 10) {
                ws.send(JSON.stringify({
                  type: 'system-message',
                  content: '⚠️ All 10 stage slots are full! Host can manage seats or viewers can request slots.'
                }));
                break;
              }

              const newGuest: RoomGuest = {
                id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                seatNumber: data.seatNumber,
                slotType: data.slotType || (room.type === 'video' ? 'video' : 'audio'),
                isMicOn: true,
                isVideoOn: data.slotType === 'video' || room.type === 'video',
                isSpeaking: false,
                isMutedByHost: false,
                user: data.user || currentUserStore
              };

              room.guests.push(newGuest);

              // Remove from stage requests if present
              room.stageRequests = room.stageRequests.filter(sr => sr.user.id !== targetUserId);

              broadcastToRoom(conn.roomId, {
                type: 'system-message',
                content: `🎤 ${newGuest.user.name} joined Stage Slot #${data.seatNumber}!`
              });
            } else if (data.action === 'leave') {
              const guestLeaving = room.guests.find((g) => g.seatNumber === data.seatNumber);
              room.guests = room.guests.filter((g) => g.seatNumber !== data.seatNumber);
              if (guestLeaving) {
                broadcastToRoom(conn.roomId, {
                  type: 'system-message',
                  content: `👋 ${guestLeaving.user.name} stepped down from Stage Slot #${data.seatNumber}`
                });
              }
            } else if (data.action === 'kick') {
              // Host kicks guest from slot back to audience
              const guestToKick = room.guests.find((g) => g.seatNumber === data.seatNumber);
              room.guests = room.guests.filter((g) => g.seatNumber !== data.seatNumber);
              if (guestToKick) {
                broadcastToRoom(conn.roomId, {
                  type: 'system-message',
                  content: `🚫 Host moved ${guestToKick.user.name} back to the audience.`
                });
              }
            } else if (data.action === 'toggle-mic') {
              const guest = room.guests.find((g) => g.seatNumber === data.seatNumber);
              if (guest) {
                guest.isMicOn = !guest.isMicOn;
              }
            } else if (data.action === 'host-toggle-mute') {
              const guest = room.guests.find((g) => g.seatNumber === data.seatNumber);
              if (guest) {
                guest.isMutedByHost = !guest.isMutedByHost;
                guest.isMicOn = !guest.isMutedByHost;
              }
            } else if (data.action === 'toggle-video') {
              const guest = room.guests.find((g) => g.seatNumber === data.seatNumber);
              if (guest) {
                guest.isVideoOn = !guest.isVideoOn;
              }
            } else if (data.action === 'request-stage') {
              // Audience viewer requests stage slot
              const requestUser = data.user || currentUserStore;
              const existingReq = room.stageRequests.find(sr => sr.user.id === requestUser.id);
              if (!existingReq) {
                room.stageRequests.push({
                  id: `req_${Date.now()}`,
                  user: requestUser,
                  type: data.slotType || 'video',
                  requestedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                });
                broadcastToRoom(conn.roomId, {
                  type: 'system-message',
                  content: `✋ ${requestUser.name} requested to join Stage (${room.stageRequests.length} in queue)`
                });
              }
            } else if (data.action === 'cancel-request') {
              const requestUser = data.user || currentUserStore;
              room.stageRequests = room.stageRequests.filter(sr => sr.user.id !== requestUser.id);
            } else if (data.action === 'approve-request') {
              const requestToApprove = room.stageRequests.find(sr => sr.id === data.requestId);
              if (requestToApprove && room.guests.length < 10) {
                // Find first available seat number 1-10
                let openSeat = 1;
                for (let i = 1; i <= 10; i++) {
                  if (!room.guests.some(g => g.seatNumber === i)) {
                    openSeat = i;
                    break;
                  }
                }
                const newGuest: RoomGuest = {
                  id: `guest_${Date.now()}`,
                  seatNumber: openSeat,
                  slotType: requestToApprove.type,
                  isMicOn: true,
                  isVideoOn: requestToApprove.type === 'video',
                  isSpeaking: false,
                  isMutedByHost: false,
                  user: requestToApprove.user
                };
                room.guests.push(newGuest);
                room.stageRequests = room.stageRequests.filter(sr => sr.id !== data.requestId);

                broadcastToRoom(conn.roomId, {
                  type: 'system-message',
                  content: `🎉 Host approved ${requestToApprove.user.name} for Stage Slot #${openSeat}!`
                });
              }
            }

            broadcastToRoom(conn.roomId, {
              type: 'guests-update',
              guests: room.guests,
              stageRequests: room.stageRequests
            });
          }
          break;
        }

        case 'draw-stroke': {
          if (!conn.roomId) break;
          broadcastToRoom(conn.roomId, {
            type: 'draw-stroke',
            stroke: data.stroke
          }, ws);
          break;
        }

        case 'clear-canvas': {
          if (!conn.roomId) break;
          broadcastToRoom(conn.roomId, {
            type: 'clear-canvas'
          });
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket Error:', err);
    }
  });

  ws.on('close', () => {
    activeClients.delete(conn);
    if (conn.roomId) {
      const room = roomsStore.find((r) => r.id === conn.roomId);
      if (room && room.viewerCount > 0) {
        room.viewerCount -= 1;
        broadcastToRoom(conn.roomId, {
          type: 'viewer-count-update',
          viewerCount: room.viewerCount,
        });
      }
    }
  });
});

// REST API Endpoints
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Streams REST
app.get('/api/streams', (req, res) => {
  const category = req.query.category as string;
  const country = req.query.country as string;
  const filter = req.query.filter as string; // 'hot', 'recommend'

  let list = [...roomsStore];

  if (category && category !== 'All') {
    list = list.filter((r) => r.category.toLowerCase() === category.toLowerCase() || r.type === category.toLowerCase());
  }

  if (country && country !== 'All') {
    list = list.filter((r) => r.country.toLowerCase() === country.toLowerCase());
  }

  if (filter === 'hot') {
    list = list.filter((r) => r.isHot);
  } else if (filter === 'recommend') {
    list = list.filter((r) => r.isRecommended);
  }

  res.json(list);
});

// Create Stream
app.post('/api/streams', (req, res) => {
  const { title, category, type, country, countryFlag, coverImage, tags } = req.body;

  const newRoom: StreamRoom = {
    id: `room_${Date.now()}`,
    title: title || `${currentUserStore.name}'s Live Stream`,
    type: type || 'video',
    category: category || 'Gaming',
    country: country || currentUserStore.country,
    countryFlag: countryFlag || currentUserStore.countryFlag,
    coverImage: coverImage || 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800',
    viewerCount: 1,
    likeCount: 0,
    tags: tags || ['Live', 'Fun'],
    isHot: true,
    isRecommended: true,
    durationSeconds: 0,
    pinnedMessage: `Welcome to ${currentUserStore.name}'s room! Say hi in chat! 👋`,
    host: currentUserStore,
    guests: []
  };

  roomsStore.unshift(newRoom);
  res.json(newRoom);
});

// User Profile & Wallet
app.get('/api/user/profile', (_req, res) => {
  res.json(currentUserStore);
});

app.post('/api/wallet/buy-coins', (req, res) => {
  const { amount } = req.body;
  if (typeof amount === 'number' && amount > 0) {
    currentUserStore.coins += amount;
  }
  res.json({ coins: currentUserStore.coins, diamonds: currentUserStore.diamonds });
});

// Auth endpoints
app.post('/api/auth/guest', (_req, res) => {
  res.json({ user: currentUserStore, token: 'guest_token_12345' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, name } = req.body;
  if (name) currentUserStore.name = name;
  res.json({ user: currentUserStore, token: 'auth_token_98765' });
});

// Reels
app.get('/api/reels', (_req, res) => {
  res.json(reelsStore);
});

// Notifications
app.get('/api/notifications', (_req, res) => {
  res.json(notificationsStore);
});

// Serve frontend in dev / prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VibeLive Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
