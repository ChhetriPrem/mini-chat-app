import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { CURRENT_USER } from '../mockData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface StoredAccount {
  id: string;
  name: string;
  handle: string;
  email: string;
  passwordHash: string;
  avatar: string;
  bio?: string;
  level: number;
  coins: number;
  diamonds: number;
}

interface AuthContextType {
  user: User;
  isAuthenticated: boolean;
  loginGuest: () => void;
  loginUser: (name: string, email: string) => void;
  loginUserWithPassword: (emailOrHandle: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signupUser: (params: { name: string; handle: string; email: string; password: string; avatar?: string; bio?: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  buyCoins: (amount: number) => void;
  deductCoins: (amount: number) => boolean;
  addDiamonds: (amount: number) => void;
  updateUser: (updates: Partial<User>) => void;
  followingIds: Set<string>;
  toggleFollow: (userId: string) => void;
  registeredAccounts: StoredAccount[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'usr_maya',
    name: 'Maya Lin',
    handle: 'maya_official',
    email: 'maya@vibelive.app',
    passwordHash: 'password123',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    bio: 'Top Streamer & Musician 🎵',
    level: 42,
    coins: 52000,
    diamonds: 184000,
  },
  {
    id: 'usr_sam',
    name: 'Sam Beats',
    handle: 'sam_beats',
    email: 'sam@vibelive.app',
    passwordHash: 'password123',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    bio: 'Electronic Music Producer & DJ 🎧',
    level: 35,
    coins: 12500,
    diamonds: 45000,
  },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    const saved = localStorage.getItem('vibelive_user');
    return saved ? JSON.parse(saved) : CURRENT_USER;
  });

  const [registeredAccounts, setRegisteredAccounts] = useState<StoredAccount[]>(() => {
    const saved = localStorage.getItem('vibelive_accounts');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_ACCOUNTS;
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  const [followingIds, setFollowingIds] = useState<Set<string>>(() => {
    return new Set(['usr_maya', 'usr_sam']);
  });

  useEffect(() => {
    localStorage.setItem('vibelive_user', JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem('vibelive_accounts', JSON.stringify(registeredAccounts));
  }, [registeredAccounts]);

  const loginGuest = () => {
    const guestUser: User = {
      ...CURRENT_USER,
      id: `guest_${Date.now()}`,
      name: `Guest Creator ${Math.floor(Math.random() * 900 + 100)}`,
      handle: `guest_${Math.floor(Math.random() * 9000 + 1000)}`,
      coins: 5000,
    };
    setUser(guestUser);
  };

  const loginUser = (name: string, _email: string) => {
    setUser((prev) => ({
      ...prev,
      name,
      handle: name.toLowerCase().replace(/\s+/g, '_'),
    }));
  };

  const loginUserWithPassword = async (emailOrHandle: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const query = emailOrHandle.trim().toLowerCase();

    // 1. Try Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: query,
        password,
      });
      if (!error && data.user) {
        const loggedUser: User = {
          id: data.user.id,
          name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'VibeUser',
          handle: data.user.user_metadata?.handle || 'user_' + data.user.id.substring(0, 5),
          avatar: data.user.user_metadata?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
          country: 'USA',
          countryFlag: '🇺🇸',
          level: 10,
          vipLevel: 1,
          svip: false,
          isVerified: true,
          bio: 'Verified Vibe Creator',
          followers: 120,
          following: 45,
          friends: 30,
          visitors: 500,
          coins: 10000,
          diamonds: 500,
        };
        setUser(loggedUser);
        return { success: true };
      }
    }

    // 2. Fallback to registered accounts database
    const found = registeredAccounts.find(
      (a) => a.email.toLowerCase() === query || a.handle.toLowerCase() === query
    );

    if (!found) {
      return { success: false, error: 'User account not found. Please sign up or try a preset account.' };
    }

    if (found.passwordHash !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    const userObj: User = {
      id: found.id,
      name: found.name,
      handle: found.handle,
      avatar: found.avatar,
      country: 'USA',
      countryFlag: '🇺🇸',
      level: found.level || 1,
      vipLevel: 1,
      svip: false,
      isVerified: true,
      bio: found.bio || 'Vibe Creator',
      followers: 240,
      following: 12,
      friends: 15,
      visitors: 890,
      coins: found.coins || 10000,
      diamonds: found.diamonds || 1000,
    };

    setUser(userObj);
    return { success: true };
  };

  const signupUser = async ({
    name,
    handle,
    email,
    password,
    avatar,
    bio,
  }: {
    name: string;
    handle: string;
    email: string;
    password: string;
    avatar?: string;
    bio?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanEmail = email.trim().toLowerCase();

    if (!name.trim()) return { success: false, error: 'Please enter your display name.' };
    if (!cleanHandle) return { success: false, error: 'Please enter a valid username.' };
    if (!cleanEmail.includes('@')) return { success: false, error: 'Please enter a valid email address.' };
    if (password.length < 4) return { success: false, error: 'Password must be at least 4 characters long.' };

    const exists = registeredAccounts.some(
      (a) => a.email.toLowerCase() === cleanEmail || a.handle.toLowerCase() === cleanHandle
    );

    if (exists) {
      return { success: false, error: 'Account with this email or handle already exists.' };
    }

    // Try Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: name,
            handle: cleanHandle,
            avatar,
          },
        },
      });
    }

    const newAcc: StoredAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      handle: cleanHandle,
      email: cleanEmail,
      passwordHash: password,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400',
      bio: bio || 'Excited to be on VibeLive! ✨',
      level: 1,
      coins: 10000, // 10,000 Welcome Bonus Coins
      diamonds: 500,
    };

    setRegisteredAccounts((prev) => [...prev, newAcc]);

    const newUserObj: User = {
      id: newAcc.id,
      name: newAcc.name,
      handle: newAcc.handle,
      avatar: newAcc.avatar,
      country: 'USA',
      countryFlag: '🇺🇸',
      level: 1,
      vipLevel: 1,
      svip: false,
      isVerified: false,
      bio: newAcc.bio || '',
      followers: 1,
      following: 0,
      friends: 0,
      visitors: 1,
      coins: 10000,
      diamonds: 500,
    };

    setUser(newUserObj);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('vibelive_user');
    loginGuest();
  };

  const buyCoins = (amount: number) => {
    setUser((prev) => ({ ...prev, coins: prev.coins + amount }));
  };

  const deductCoins = (amount: number): boolean => {
    if (user.coins >= amount) {
      setUser((prev) => ({ ...prev, coins: prev.coins - amount }));
      return true;
    }
    return false;
  };

  const addDiamonds = (amount: number) => {
    setUser((prev) => ({ ...prev, diamonds: prev.diamonds + amount }));
  };

  const updateUser = (updates: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const toggleFollow = (targetUserId: string) => {
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetUserId)) {
        next.delete(targetUserId);
        setUser((u) => ({ ...u, following: Math.max(0, u.following - 1) }));
      } else {
        next.add(targetUserId);
        setUser((u) => ({ ...u, following: u.following + 1 }));
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        loginGuest,
        loginUser,
        loginUserWithPassword,
        signupUser,
        logout,
        buyCoins,
        deductCoins,
        addDiamonds,
        updateUser,
        followingIds,
        toggleFollow,
        registeredAccounts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
