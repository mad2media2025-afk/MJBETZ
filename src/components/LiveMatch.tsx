/**
 * LiveMatch.tsx — Live IPL Scoreboard with Real-time Data
 * Shows: Current batsmen at crease, bowler stats, ball-by-ball,
 * both innings, match note, full scorecard, live odds
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Clock, ChevronDown, ChevronUp, Wifi, WifiOff, Trophy, CheckCircle } from 'lucide-react';
import type { LiveMatch } from '../types';

interface OddsBtnProps {
  label: string; odds: number; selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}
function OddsBtn({ label, odds, selected, onClick, disabled }: OddsBtnProps) {
  return (
    <motion.button whileTap={disabled ? undefined : { scale: 0.96 }} onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex-1 flex flex-col items-center py-4 rounded-2xl border transition-all ${
        disabled
          ? 'bg-zinc-950/50 border-zinc-800 opacity-50 cursor-not-allowed'
          : selected
          ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
          : 'bg-zinc-900 border-zinc-800 hover:border-emerald-500/50'
      }`}
    >
      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{label}</span>
      <span className={`text-2xl font-black ${selected ? 'text-emerald-400' : 'text-white'}`}>{odds.toFixed(2)}</span>
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
  const [showScorecard, setShowScorecard] = useState(false);

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

  // Determine batting team name for display
  const battingTeamShort = match.battingTeamId === match.team1Id ? match.team1Short : match.team2Short;
  const bowlingTeamShort = match.battingTeamId === match.team1Id ? match.team2Short : match.team1Short;

  return (
    <div className="space-y-3">

      {/* Score card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Live pill header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5">
            {match.status === 'pre-match' ? (
              <span className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                UPCOMING
              </span>
            ) : match.status === 'completed' ? (
              <span className="flex items-center gap-1.5 bg-zinc-500/10 border border-zinc-500/30 text-zinc-400 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                COMPLETED
              </span>
            ) : (
              <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            <span className="text-xs font-bold text-zinc-300">{match.team1Short} vs {match.team2Short}</span>
          </div>
          <div className="flex items-center gap-2">
            {match.isLiveFromApi ? (
               <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold">
                 <Wifi className="w-3 h-3" /> LIVE API
               </span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-500 text-[9px] font-bold">
                <WifiOff className="w-3 h-3" /> SIM
              </span>
            )}
            <span className="text-[10px] text-zinc-500 underline decoration-zinc-800 underline-offset-4">IPL 2026 • T20</span>
          </div>
        </div>

        {/* Dynamic Display Area */}
        {match.status === 'pre-match' ? (
          <div className="px-5 py-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center mb-4 shadow-xl shadow-black/50">
              <Clock className="w-7 h-7 text-emerald-400" />
            </div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Indian Premier League 2026</p>
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
        ) : match.status === 'completed' ? (
          <div className="px-5 py-10 flex flex-col items-center justify-center text-center bg-zinc-950/40">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            
            <div className="flex items-center gap-10 mb-8">
              <div className="text-right">
                <p className="text-3xl font-black text-white">{match.team1Short}</p>
                <p className="text-sm font-bold text-zinc-500">{match.score1}/{match.wickets1} <span className="text-[10px] font-normal italic">({match.overs})</span></p>
              </div>
              <div className="text-zinc-700 font-black text-2xl italic tracking-tighter">V/S</div>
              <div className="text-left">
                <p className="text-3xl font-black text-white">{match.team2Short}</p>
                <p className="text-sm font-bold text-zinc-500">{match.score2 || match.score1}/{match.wickets2 || match.wickets1} <span className="text-[10px] font-normal italic">({match.overs2 || match.overs})</span></p>
              </div>
            </div>

            <div className="bg-emerald-500/5 border border-emerald-500/20 px-8 py-3 rounded-2xl mb-4">
              <h2 className="text-xl font-black text-emerald-400 uppercase tracking-tighter">
                {match.result || 'MATCH COMPLETED'}
              </h2>
            </div>
            
            {match.potm && (
              <div className="flex items-center gap-2.5 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-[11px] font-bold text-zinc-300">POTM: <span className="text-white uppercase">{match.potm}</span></span>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-5">
            {/* Live Scores */}
            {match.currentInnings === 2 && match.score2 !== undefined ? (
              <div className="mb-4">
                <div className="bg-zinc-800/40 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{bowlingTeamShort} — 1st Innings</span>
                  <span className="text-sm font-black text-zinc-300">{match.score1}/{match.wickets1} <span className="text-zinc-500 text-[10px] font-normal">({match.overs} ov)</span></span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{battingTeamShort} — 2nd Innings</p>
                    <motion.div key={match.score2} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="text-6xl font-black leading-none">
                      {match.score2}/{match.wickets2}
                    </motion.div>
                    <p className="text-zinc-400 text-sm mt-1">{match.overs2} overs</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase">Last Ball</span>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white ${lastBallColor}`}>
                      {match.lastBall}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-end justify-between mb-4">
                <div>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{battingTeamShort || match.team1Short} — 1st Innings</p>
                  <motion.div key={match.score1} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="text-6xl font-black leading-none text-white">
                    {match.score1}/{match.wickets1}
                  </motion.div>
                  <p className="text-zinc-400 text-sm mt-1">{match.overs} overs</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">Last Ball</span>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-black text-white ${lastBallColor}`}>
                    {match.lastBall}
                  </div>
                </div>
              </div>
            )}

            {/* Match Note */}
            {match.matchNote && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2 mb-4">
                <p className="text-xs text-emerald-400 font-semibold text-center">{match.matchNote}</p>
              </div>
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'CRR', value: match.crr.toFixed(2) },
                { label: 'RRR', value: match.rrr > 0 ? match.rrr.toFixed(2) : '—' },
                { label: `${match.team1Short} Win%`, value: `${match.team1WinProb}%` },
                { label: `${match.team2Short} Win%`, value: `${match.team2WinProb}%` },
              ].map(s => (
                <div key={s.label} className="bg-zinc-800/60 rounded-xl px-3 py-2.5 text-center border border-zinc-700/30">
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{s.label}</p>
                  <p className="text-lg font-black mt-0.5 text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Current Batsmen & Bowler */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
               {match.batsmen.slice(0, 2).map((b, i) => (
                 <div key={i} className="bg-zinc-800/50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-black uppercase text-white shadow-lg">
                      {b.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">{b.name} {b.isStriker ? '*' : ''}</p>
                      <p className="text-[10px] text-emerald-400 font-black">{b.runs} ({b.balls})</p>
                    </div>
                 </div>
               ))}
            </div>

            {/* Scorecard Toggle */}
            <button
               onClick={() => setShowScorecard(!showScorecard)}
               className="w-full flex items-center justify-center gap-2 py-2 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl transition text-zinc-500 hover:text-white"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">
                {showScorecard ? 'Hide' : 'Show'} Full Scorecard
              </span>
              {showScorecard ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {showScorecard && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
                   {/* Batsmen */}
                   <div className="grid grid-cols-5 gap-1 text-[10px] text-zinc-500 font-bold border-b border-zinc-800 pb-2 mb-2 px-1">
                      <span className="col-span-2">Batter</span>
                      <span className="text-center">R</span>
                      <span className="text-center">B</span>
                      <span className="text-center">SR</span>
                   </div>
                   {match.allBatsmen?.map((b, i) => (
                     <div key={i} className="grid grid-cols-5 gap-1 text-[11px] py-1.5 px-1 border-b border-zinc-900/50 items-center">
                        <span className={`col-span-2 font-bold ${b.isActive ? 'text-emerald-400' : 'text-zinc-300'}`}>{b.name}</span>
                        <span className="text-center font-black text-white">{b.runs}</span>
                        <span className="text-center text-zinc-500">{b.balls}</span>
                        <span className="text-center text-zinc-600">{(b.runs / (b.balls || 1) * 100).toFixed(0)}</span>
                     </div>
                   ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Match winner odds buttons */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-sm tracking-tight">Match Winner <span className="text-[10px] text-zinc-500 font-normal ml-1">• Final Result Market</span></h3>
        </div>
        <div className="flex gap-3">
          <OddsBtn
            label={`${match.team1Short} to Win`} 
            odds={match.liveOdds1 || 1.90}
            selected={selectedOdds['match-winner'] === `${match.team1Short} Win`}
            onClick={() => onBet('match-winner', `${match.team1Short} Win`, match.liveOdds1 || 1.90)}
            disabled={match.status === 'completed'}
          />
          <OddsBtn
            label={`${match.team2Short} to Win`} 
            odds={match.liveOdds2 || 1.90}
            selected={selectedOdds['match-winner'] === `${match.team2Short} Win`}
            onClick={() => onBet('match-winner', `${match.team2Short} Win`, match.liveOdds2 || 1.90)}
            disabled={match.status === 'completed'}
          />
        </div>
      </div>
    </div>
  );
}
