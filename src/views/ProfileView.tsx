import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ChevronLeft,
  Pencil,
  Copy,
  Crown,
  ChevronRight,
  Store,
  CheckSquare,
  Users,
  Shield,
  Heart,
  Briefcase,
  FileText,
  Zap,
  Headphones,
  Video,
  Award,
  Check,
} from 'lucide-react';

interface ProfileViewProps {
  onOpenWallet: () => void;
  onOpenCreatorDashboard: () => void;
  onOpenAuth: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  onOpenWallet,
  onOpenCreatorDashboard,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = React.useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText('50953432258');
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto space-y-4 bg-[#110729] min-h-screen text-white">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onOpenAuth}
          className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-pink-500 hover:opacity-90 rounded-full text-xs font-black text-white shadow-md transition-all flex items-center space-x-1"
        >
          <span>Login / Switch</span>
        </button>
      </div>

      {/* Profile Header & Ornate Crown Frame */}
      <div className="flex flex-col items-center text-center space-y-2">
        <div className="relative">
          {/* Ornate Gold Crown Ring */}
          <div className="absolute -inset-2 bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 rounded-full blur-sm animate-pulse opacity-80" />
          <img
            src={user.avatar}
            alt={user.name}
            className="relative w-20 h-20 rounded-full object-cover ring-4 ring-amber-400/90 shadow-2xl"
          />
          <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-7 h-7 text-yellow-300 filter drop-shadow-md animate-bounce" />
        </div>

        {/* Name & Gender / Country Flag */}
        <div className="flex items-center space-x-1.5 pt-1">
          <h2 className="text-xl font-black text-white">{user.name}</h2>
          <span className="text-sm">♂</span>
          <span className="text-base">{user.countryFlag}</span>
        </div>

        {/* User ID & Copy Button */}
        <div className="flex items-center space-x-1.5 text-xs text-gray-300 bg-white/5 px-3 py-1 rounded-full border border-white/10">
          <span>ID: 50953432258</span>
          <button onClick={handleCopyId} className="hover:text-pink-400 transition-colors">
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Level & VIP Badges Row */}
        <div className="flex items-center space-x-1.5 pt-1 flex-wrap justify-center">
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-400/40">
            LV.12
          </span>
          <span className="bg-gradient-to-r from-amber-500 to-yellow-600 text-[10px] font-black px-2.5 py-0.5 rounded-full text-black border border-amber-300/60">
            SVIP
          </span>
          <span className="bg-purple-900/60 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-500/30 text-purple-200">
            Agency
          </span>
          <span className="bg-pink-900/60 text-[10px] font-bold px-2 py-0.5 rounded-full border border-pink-500/30 text-pink-200">
            Verified
          </span>
        </div>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-4 gap-2 text-center bg-white/5 border border-white/10 p-3 rounded-2xl">
        <div>
          <span className="text-sm font-black text-white">{user.friends.toLocaleString()}</span>
          <p className="text-[10px] text-gray-400 font-medium">Friend</p>
        </div>
        <div>
          <span className="text-sm font-black text-white">{user.following.toLocaleString()}</span>
          <p className="text-[10px] text-gray-400 font-medium">Following</p>
        </div>
        <div>
          <span className="text-sm font-black text-white">{user.followers.toLocaleString()}</span>
          <p className="text-[10px] text-gray-400 font-medium">Followers</p>
        </div>
        <div>
          <span className="text-sm font-black text-white">{user.visitors.toLocaleString()}</span>
          <p className="text-[10px] text-gray-400 font-medium">Visitors</p>
        </div>
      </div>

      {/* SVIP Club Card */}
      <div className="relative rounded-2xl p-3.5 bg-gradient-to-r from-[#310c66] via-[#61168f] to-[#25084a] border border-amber-400/40 shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 font-black">
            👑
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-300">SVIP Club</h4>
            <p className="text-[10px] text-purple-200">Enjoy distinguished privileges & custom frames</p>
          </div>
        </div>

        <button className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-xs rounded-full shadow-md hover:scale-105 transition-transform">
          Get SVIP
        </button>
      </div>

      {/* Wallet Balance Cards (Yellow Diamonds & Purple Coins) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Diamond Card */}
        <button
          onClick={onOpenWallet}
          className="bg-gradient-to-br from-emerald-950/80 to-emerald-900/50 border border-emerald-500/40 p-3 rounded-2xl flex items-center justify-between hover:scale-102 transition-transform text-left"
        >
          <div className="flex items-center space-x-2">
            <span className="text-2xl">💎</span>
            <div>
              <span className="text-xs text-emerald-300 font-bold block">Diamonds</span>
              <span className="text-lg font-black text-white">{user.diamonds.toLocaleString()}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-400" />
        </button>

        {/* Coin Card */}
        <button
          onClick={onOpenWallet}
          className="bg-gradient-to-br from-purple-950/80 to-purple-900/50 border border-purple-500/40 p-3 rounded-2xl flex items-center justify-between hover:scale-102 transition-transform text-left"
        >
          <div className="flex items-center space-x-2">
            <span className="text-2xl">🪙</span>
            <div>
              <span className="text-xs text-purple-300 font-bold block">Coins</span>
              <span className="text-lg font-black text-white">{user.coins.toLocaleString()}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-purple-400" />
        </button>
      </div>

      {/* Quick Action Grid (12 Items matching exact reference icons) */}
      <div className="grid grid-cols-4 gap-3 bg-white/5 border border-white/10 p-3.5 rounded-2xl">
        {[
          { label: 'Level', icon: Award, color: 'text-amber-400', action: () => {} },
          { label: 'Store', icon: Store, color: 'text-purple-400', action: () => {} },
          { label: 'Tasks', icon: CheckSquare, color: 'text-pink-400', action: () => {} },
          { label: 'Family', icon: Users, color: 'text-indigo-400', action: () => {} },
          { label: 'VIP', icon: Shield, color: 'text-yellow-400', action: () => {} },
          { label: 'CP', icon: Heart, color: 'text-pink-500', action: () => {} },
          { label: 'BD Center', icon: Briefcase, color: 'text-emerald-400', action: () => {} },
          { label: 'Agency Center', icon: Briefcase, color: 'text-amber-400', action: () => {} },
          { label: 'My Post', icon: FileText, color: 'text-blue-400', action: () => {} },
          { label: 'Offline Recharge', icon: Zap, color: 'text-yellow-400', action: onOpenWallet },
          { label: 'Host Center', icon: Headphones, color: 'text-purple-400', action: onOpenCreatorDashboard },
          { label: 'My Videos', icon: Video, color: 'text-pink-400', action: () => {} },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={item.action}
              className="flex flex-col items-center justify-center space-y-1.5 p-2 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-[10px] font-bold text-gray-200 text-center">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
