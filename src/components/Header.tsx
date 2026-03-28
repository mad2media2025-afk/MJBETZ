/**
 * Header.tsx — Top navigation bar
 * Security banner + logo + pill nav + balance + user profile dropdown
 * Enhanced: proper click-toggle profile menu, visible logout & withdraw button
 */
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Play, Clock, Wallet, LogOut,
  Shield, ChevronDown, ArrowDownToLine, Plus, Users, Copy, CheckCircle,
} from 'lucide-react';
import type { User } from '../types';

interface Props {
  user: User;
  balance: number;
  referralCode: string;
  referralCount: number;
  activeTab: 'live' | 'upcoming' | 'mybets';
  onTabChange: (tab: 'live' | 'upcoming' | 'mybets') => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onLogout: () => void;
}

export default function Header({ user, balance, referralCode, referralCount, activeTab, onTabChange, onDeposit, onWithdraw, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(`https://mjbet-e4ed1.web.app/?ref=${referralCode}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
      {/* 256-bit SSL banner */}
      <div className="bg-emerald-950/60 border-b border-emerald-900/40 py-1.5 px-4 flex items-center justify-center gap-2 text-[11px] text-emerald-400/80 font-medium tracking-wider">
        <Shield className="w-3 h-3 shrink-0" />
        256-BIT ENCRYPTED &nbsp;•&nbsp; SECURE &nbsp;•&nbsp; LICENSED &nbsp;•&nbsp; INSTANT PAYOUTS
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/60 w-full overflow-hidden">
        {/* UPDATED: Reduced padding and gap for mobile */}
        <div className="max-w-[1400px] w-full mx-auto px-2 sm:px-4 h-[62px] flex items-center justify-between gap-1 sm:gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-lg shadow-emerald-900/50">
              <Trophy className="w-4.5 h-4.5 text-black" />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-lg font-black tracking-tighter text-white">
                IPL <span className="text-emerald-400">BET</span>
              </div>
              <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest -mt-0.5">2026 Season</div>
            </div>
          </div>

          {/* Center pill nav */}
          <nav className="flex items-center bg-zinc-900 rounded-full p-1 border border-zinc-800">
            {([
              { id: 'upcoming', icon: <Trophy className="w-3.5 h-3.5" />, label: 'MATCHES' },
              { id: 'live',     icon: <Play className="w-3.5 h-3.5" />,   label: 'LIVE' },
              { id: 'mybets',   icon: <Clock className="w-3.5 h-3.5" />,  label: 'MY BETS' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                // UPDATED: Tighter padding on mobile + min-h-[44px] touch target
                className={`flex items-center justify-center gap-1.5 px-3 sm:px-5 min-h-[44px] sm:min-h-[auto] py-2 rounded-full text-[11px] sm:text-xs font-bold transition-all touch-manipulation ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Right: balance + withdraw + deposit + user */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Balance pill (click to deposit) */}
            <button
              onClick={onDeposit}
              // UPDATED: touch-manipulation, min-h-[44px], active state
              className="flex items-center justify-center gap-1.5 sm:gap-2 bg-zinc-900 border border-zinc-800 pl-2 pr-2.5 sm:pl-3 sm:pr-3.5 min-h-[44px] min-w-[80px] sm:py-1.5 rounded-full cursor-pointer active:bg-zinc-800 active:border-zinc-700 transition group touch-manipulation"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
              <div className="flex flex-col text-left">
                {/* UPDATED: Hidden the "Balance" label on tiny screens, keeping the amount big */}
                <span className="hidden sm:inline-block text-[9px] text-zinc-500 font-bold uppercase tracking-wider leading-none">Balance</span>
                <span className="text-[11px] sm:text-xs font-black text-white leading-tight">₹{balance.toLocaleString()}</span>
              </div>
              <Plus className="hidden sm:block w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition" />
            </button>

            {/* Withdraw button — visible on sm+ */}
            <button
              onClick={onWithdraw}
              className="hidden sm:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-3.5 py-2 rounded-full text-[10px] font-bold text-orange-400 hover:text-orange-300 hover:bg-zinc-800 hover:border-orange-500/30 transition uppercase tracking-wider"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              Withdraw
            </button>

            {/* User profile pill with click-toggle dropdown */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className={`flex items-center gap-2 bg-zinc-900 border p-1 pr-2.5 rounded-full transition-all ${
                  menuOpen ? 'border-emerald-500/40 bg-zinc-800' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {user.avatar.startsWith('http') ? (
                  <img src={user.avatar} alt="User" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-[10px] font-black text-black">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:flex flex-col max-w-[80px]">
                  <span className="text-[11px] font-bold text-white leading-tight truncate">{user.name.split(' ')[0]}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2.5 w-56 bg-zinc-900 border border-zinc-800 rounded-2xl py-1.5 shadow-2xl shadow-black/50 z-50 overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-zinc-800/60">
                      <div className="flex items-center gap-3">
                        {user.avatar.startsWith('http') ? (
                          <img src={user.avatar} alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-sm font-black text-black border-2 border-emerald-500/30">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 bg-zinc-800/60 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Wallet</span>
                        <span className="text-sm font-black text-emerald-400">₹{balance.toLocaleString()}</span>
                      </div>
                      {/* Referral info */}
                      <div className="mt-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Users className="w-3 h-3" /> Referrals
                          </span>
                          <span className="text-xs font-black text-purple-300">{referralCount} friend{referralCount !== 1 ? 's' : ''}</span>
                        </div>
                        <button
                          onClick={handleCopyCode}
                          className={`w-full flex items-center justify-between text-[10px] font-mono rounded-lg px-2 py-1.5 transition-all ${
                            copied ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <span>Code: <span className="font-black">{referralCode}</span></span>
                          {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-500" />}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="py-1">
                      <button
                        onClick={() => { setMenuOpen(false); onDeposit(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800/60 transition"
                      >
                        <Plus className="w-4 h-4 text-emerald-500" /> Deposit Money
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); onWithdraw(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-orange-400 hover:bg-zinc-800/60 transition"
                      >
                        <ArrowDownToLine className="w-4 h-4 text-orange-400" /> Withdraw Funds
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); onTabChange('mybets'); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                      >
                        <Clock className="w-4 h-4 text-zinc-500" /> My Bets
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-zinc-800/60 pt-1 pb-0.5">
                      <button
                        onClick={() => { setMenuOpen(false); onLogout(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-500/10 transition"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
