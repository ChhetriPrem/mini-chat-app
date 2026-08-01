import React, { useState } from 'react';
import { Search, Send, MessageSquare } from 'lucide-react';
import { User } from '../types';

export const MessagesView: React.FC = () => {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputMsg, setInputMsg] = useState('');
  const [chats, setChats] = useState<Array<{
    id: string;
    user: Partial<User>;
    lastMsg: string;
    time: string;
    unread: number;
    messages: Array<{ sender: 'me' | 'them'; text: string }>;
  }>>([]);

  const activeChat = chats.find((c) => c.id === activeChatId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() || !activeChatId) return;

    setChats((prev) =>
      prev.map((c) => {
        if (c.id === activeChatId) {
          return {
            ...c,
            lastMsg: inputMsg,
            time: 'Just now',
            messages: [...c.messages, { sender: 'me', text: inputMsg }],
          };
        }
        return c;
      })
    );
    setInputMsg('');
  };

  return (
    <div className="pb-24 pt-3 px-3 max-w-md mx-auto space-y-3 min-h-screen text-white bg-[#0f0826]">
      <h2 className="text-lg font-black text-white px-1">Messages & Chats</h2>

      {/* Conversations List */}
      <div className="space-y-2">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center space-x-3 ${
              activeChatId === chat.id
                ? 'bg-purple-900/50 border-pink-500/50 shadow-md'
                : 'bg-white/5 border-white/10 hover:border-white/20'
            }`}
          >
            <div className="relative">
              <img
                src={chat.user.avatar}
                alt={chat.user.name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-pink-500/50"
              />
              {chat.unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-black">
                  {chat.unread}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-black text-white truncate">{chat.user.name}</span>
                <span className="text-[10px] text-gray-400">{chat.time}</span>
              </div>
              <p className="text-[11px] text-gray-300 truncate">{chat.lastMsg}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Chat Conversation Thread */}
      {activeChat && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-3 space-y-3 mt-3">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
            <img
              src={activeChat.user.avatar}
              alt={activeChat.user.name}
              className="w-7 h-7 rounded-full object-cover"
            />
            <span className="text-xs font-bold text-pink-300">{activeChat.user.name}</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {activeChat.messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs font-medium ${
                    m.sender === 'me'
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                      : 'bg-white/10 text-gray-200 border border-white/10'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="flex items-center space-x-2 pt-1">
            <input
              type="text"
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-black/50 border border-white/20 rounded-full px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
