/**
 * LiveMatch.tsx — Live IPL scoreboard with live odds
 * Updates every 7s from simulated match state in App.tsx
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, Clock } from 'lucide-react';
import type { LiveMatch } from '../types';

interface OddsBtnProps {
  label: string; odds: number; selected: boolean;
  onClick: () => void;
}
function OddsBtn({ label, odds, selected, onClick }: OddsBtnProps) {
  return (
    <motion.button whileTap={{ scale: 0.96 }} onClick={onClick}
      className={`flex-1 flex flex-col items-center py-4 rounded-2xl border transition-all ${
        selected
          ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
          : 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/50'
      }`}
    >
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-2xl font-black ${selected ? 'text-emerald-400' : 'text-white'}`}>{odds}</span>
    </motion.button>
  );
}

interface Props {
  match: LiveMatch;
  selectedOdds: Record<string, string>;
  onBet: (market: string, label: string, odds: number) => void;
}

export default function LiveMatchHero({ match, selectedOdds, onBet }: Props) {
  const lastBallColor =
    match.lastBall === 'W' ? 'bg-red-500' :
    match.lastBall === '4' ? 'bg-blue-500' :
    match.lastBall === '6' ? 'bg-purple-500' :
    match.lastBall === '0' ? 'bg-zinc-700' : 'bg-emerald-600';

  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number} | null>(null);

  useEffect(() => {
    if (match.status !== 'pre-match' || !match.startTime) return;
    
    const updateTime = () => {
      const target = new Date(match.startTime!).getTime();
      const now = new Date().getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft(null);
      } else {
        setTimeLeft({
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };
    
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [match.status, match.startTime]);

  return (
    <div className="space-y-3">

      {/* Score card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
        {/* Live pill header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            {match.status === 'pre-match' ? (
              <span className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                UPCOMING
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            <span className="text-xs font-bold text-zinc-300">{match.team1Short} vs {match.team2Short}</span>
          </div>
          <span className="text-[10px] text-zinc-500">IPL 2026 • T20</span>
        </div>

        {/* Dynamic Canvas: Pre-match Countdown vs Live Scoreboard */}
        {match.status === 'pre-match' ? (
          <div className="px-5 py-10 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-black/50">
                <Clock className="w-7 h-7 text-emerald-400" />
             </div>
             <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Indian Premier League 2026 • 1st Match</p>
             <h2 className="text-xl sm:text-2xl font-black text-white px-4 leading-tight">
               {match.team1} <br/><span className="text-emerald-400 text-sm md:text-lg block my-1">vs</span> {match.team2}
             </h2>
             
             {timeLeft ? (
               <div className="flex gap-2.5 sm:gap-3 mt-8">
                 {[ 
                   { label: 'Hours', val: timeLeft.h }, 
                   { label: 'Mins', val: timeLeft.m }, 
                   { label: 'Secs', val: timeLeft.s }
                 ].map((t, i) => (
                   <div key={t.label} className="flex gap-2.5 sm:gap-3">
                     <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-16 h-16 sm:w-20 sm:h-20 flex flex-col items-center justify-center shadow-lg shadow-black/30">
                       <span className="text-2xl sm:text-3xl font-black text-emerald-400 leading-none">{t.val.toString().padStart(2, '0')}</span>
                       <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-wider mt-1 sm:mt-1.5">{t.label}</span>
                     </div>
                     {i < 2 && <div className="text-2xl sm:text-3xl font-black text-zinc-800 self-center leading-none -mt-4">:</div>}
                   </div>
                 ))}
               </div>
             ) : (
                <div className="mt-8 px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-black tracking-widest uppercase animate-pulse">
                  Match Is Starting
                </div>
             )}
          </div>
        ) : (
        <div className="px-5 py-5">
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{match.team1Short} Batting</p>
              <motion.div
                key={match.score1}
                initial={{ scale: 1.05, color: '#34d399' }}
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ duration: 0.5 }}
                className="text-6xl font-black leading-none"
              >
                {match.score1}/{match.wickets1}
              </motion.div>
              <p className="text-zinc-400 text-sm mt-1">{match.overs} overs</p>
            </div>

            {/* Last ball */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase">Last Ball</span>
              <AnimatePresence mode="wait">
                <motion.div
                  key={match.lastBall}
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white ${lastBallColor}`}
                >
                  {match.lastBall}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Target */}
          <div className="bg-zinc-800/50 rounded-2xl px-4 py-2.5 mb-4 flex items-center justify-between">
            <p className="text-xs text-zinc-400">
              Target: <span className="text-white font-bold">{match.target}</span> &nbsp;•&nbsp;
              Need: <span className="text-orange-400 font-bold">{match.target - match.score1}</span> in <span className="text-orange-400 font-bold">
                {Math.round((match.totalOvers - match.overs) * 6)} balls
              </span>
            </p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'CRR', value: match.crr.toFixed(2) },
              { label: 'RRR', value: match.rrr.toFixed(2), accent: match.rrr > match.crr },
              { label: `${match.team1Short} Win%`, value: `${match.team1WinProb}%` },
              { label: `${match.team2Short} Win%`, value: `${match.team2WinProb}%`, accent: match.team2WinProb > match.team1WinProb },
            ].map(s => (
              <div key={s.label} className="bg-zinc-800/60 rounded-xl px-3 py-2.5 text-center">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-black mt-0.5 ${s.accent ? 'text-orange-400' : 'text-white'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Players */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {match.batsmen.map((b, i) => (
              <div key={i} className="bg-zinc-800/50 rounded-xl px-3 py-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">
                  {b.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-bold text-white leading-tight">{b.name}</p>
                  <p className="text-[10px] text-emerald-400 font-bold">{b.runs}<span className="text-zinc-500 font-normal">({b.balls})</span></p>
                </div>
              </div>
            ))}
          </div>

          {/* Bowling */}
          <div className="bg-zinc-800/50 rounded-xl px-3 py-2 flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-red-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">
              {match.bowler.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">{match.bowler.name}</p>
              <p className="text-[10px] text-zinc-400">
                {match.bowler.overs} ov &nbsp;•&nbsp; {match.bowler.wickets}w &nbsp;•&nbsp; eco: {match.bowler.economy}
              </p>
            </div>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>

          {/* Last over balls */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-bold uppercase mr-1 shrink-0">Last Over</span>
            {match.lastOverRuns.map((r, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                r === 'W' ? 'bg-red-500 text-white' :
                r === 4   ? 'bg-blue-600 text-white' :
                r === 6   ? 'bg-purple-600 text-white' :
                r === 0   ? 'bg-zinc-700 text-zinc-400' : 'bg-emerald-700 text-white'
              }`}>{r}</div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Match winner odds */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm">Match Winner</h3>
        </div>
        <div className="flex gap-3">
          <OddsBtn
            label={`${match.team1Short} Wins`} odds={parseFloat((match.team1WinProb / 25).toFixed(2))}
            selected={selectedOdds['match-winner'] === `${match.team1Short} Win`}
            onClick={() => onBet('match-winner', `${match.team1Short} Win`, parseFloat((match.team1WinProb / 25).toFixed(2)))}
          />
          <OddsBtn
            label={`${match.team2Short} Wins`} odds={parseFloat((match.team2WinProb / 25).toFixed(2))}
            selected={selectedOdds['match-winner'] === `${match.team2Short} Win`}
            onClick={() => onBet('match-winner', `${match.team2Short} Win`, parseFloat((match.team2WinProb / 25).toFixed(2)))}
          />
        </div>
      </div>
    </div>
  );
}
