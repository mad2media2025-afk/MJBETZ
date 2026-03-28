/**
 * LiveMatch.tsx — Live IPL Scoreboard with Real-time Data
 * Shows: Current batsmen at crease, bowler stats, ball-by-ball,
 * both innings, match note, full scorecard, live odds
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, Clock, ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react';
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
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
            {/* API status indicator */}
            {match.isLiveFromApi ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[9px] font-bold">
                <Wifi className="w-3 h-3" /> LIVE API
              </span>
            ) : (
              <span className="flex items-center gap-1 text-yellow-500 text-[9px] font-bold">
                <WifiOff className="w-3 h-3" /> SIM
              </span>
            )}
            <span className="text-[10px] text-zinc-500">IPL 2026 • T20</span>
          </div>
        </div>

        {/* Dynamic Canvas: Pre-match Countdown vs Live Scoreboard */}
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
        ) : (
        <div className="px-5 py-5">
          {/* ── Both Innings Display ── */}
          {match.currentInnings === 2 && match.score2 !== undefined ? (
            <div className="mb-4">
              {/* 1st Innings Summary */}
              <div className="bg-zinc-800/40 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  {bowlingTeamShort} — 1st Innings
                </span>
                <span className="text-sm font-black text-zinc-300">
                  {match.score1}/{match.wickets1} <span className="text-zinc-500 text-[10px] font-normal">({match.overs} ov)</span>
                </span>
              </div>
              {/* 2nd Innings - Current */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                    {battingTeamShort} Batting — 2nd Innings
                  </p>
                  <motion.div
                    key={match.score2}
                    initial={{ scale: 1.05, color: '#34d399' }}
                    animate={{ scale: 1, color: '#ffffff' }}
                    transition={{ duration: 0.5 }}
                    className="text-6xl font-black leading-none"
                  >
                    {match.score2}/{match.wickets2}
                  </motion.div>
                  <p className="text-zinc-400 text-sm mt-1">{match.overs2} overs</p>
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
            </div>
          ) : (
            /* Single Innings Display */
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">
                  {battingTeamShort || match.team1Short} Batting
                  {match.currentInnings ? ` — ${match.currentInnings === 1 ? '1st' : '2nd'} Innings` : ''}
                </p>
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
          )}

          {/* Match Note (e.g., "CSK need 45 runs in 30 balls") */}
          {match.matchNote && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2 mb-4"
            >
              <p className="text-xs text-emerald-400 font-semibold text-center">{match.matchNote}</p>
            </motion.div>
          )}

          {/* Target (shown during chase) */}
          {match.target > 0 && (
            <div className="bg-zinc-800/50 rounded-2xl px-4 py-2.5 mb-4 flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                Target: <span className="text-white font-bold">{match.target}</span> &nbsp;•&nbsp;
                Need: <span className="text-orange-400 font-bold">{Math.max(match.target - (match.score2 ?? match.score1), 0)}</span> in <span className="text-orange-400 font-bold">
                  {Math.max(Math.round((match.totalOvers - (match.overs2 ?? match.overs)) * 6), 0)} balls
                </span>
              </p>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: 'CRR', value: match.crr.toFixed(2) },
              { label: 'RRR', value: match.rrr > 0 ? match.rrr.toFixed(2) : '—', accent: match.rrr > match.crr },
              { label: `${match.team1Short} Win%`, value: `${match.team1WinProb}%` },
              { label: `${match.team2Short} Win%`, value: `${match.team2WinProb}%`, accent: match.team2WinProb > match.team1WinProb },
            ].map(s => (
              <div key={s.label} className="bg-zinc-800/60 rounded-xl px-3 py-2.5 text-center">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{s.label}</p>
                <p className={`text-lg font-black mt-0.5 ${s.accent ? 'text-orange-400' : 'text-white'}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Current Batsmen at Crease */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {match.batsmen.map((b, i) => (
              <div key={i} className={`bg-zinc-800/50 rounded-xl px-3 py-2.5 flex items-center gap-2 ${b.isStriker ? 'border border-emerald-500/30' : 'border border-transparent'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${b.isStriker ? 'bg-emerald-600' : 'bg-blue-600'}`}>
                  {b.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-white leading-tight truncate">{b.name}</p>
                    {b.isStriker && <span className="text-emerald-400 text-[8px] font-black">★</span>}
                  </div>
                  <p className="text-[10px] text-emerald-400 font-bold">
                    {b.runs}<span className="text-zinc-500 font-normal">({b.balls})</span>
                    {b.fours > 0 && <span className="text-blue-400 ml-1">{b.fours}×4</span>}
                    {b.sixes > 0 && <span className="text-purple-400 ml-1">{b.sixes}×6</span>}
                  </p>
                  {b.strikeRate !== undefined && b.strikeRate > 0 && (
                    <p className="text-[9px] text-zinc-600">SR: {b.strikeRate.toFixed(1)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Current Bowler */}
          <div className="bg-zinc-800/50 rounded-xl px-3 py-2.5 flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-red-700 flex items-center justify-center text-[10px] font-black flex-shrink-0">
              {match.bowler.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white">{match.bowler.name}</p>
              <p className="text-[10px] text-zinc-400">
                {match.bowler.overs} ov &nbsp;•&nbsp; {match.bowler.wickets}w
                {match.bowler.runsConceded !== undefined && <>&nbsp;•&nbsp; {match.bowler.runsConceded}r</>}
                &nbsp;•&nbsp; eco: {match.bowler.economy}
                {match.bowler.maidens !== undefined && match.bowler.maidens > 0 && <>&nbsp;•&nbsp; {match.bowler.maidens}m</>}
              </p>
            </div>
            <Activity className="w-4 h-4 text-orange-400" />
          </div>

          {/* Last over balls */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] text-zinc-500 font-bold uppercase mr-1 shrink-0">Last Over</span>
            {match.lastOverRuns.map((r, i) => (
              <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${
                r === 'W' ? 'bg-red-500 text-white' :
                r === 4 || r === '4' ? 'bg-blue-600 text-white' :
                r === 6 || r === '6' ? 'bg-purple-600 text-white' :
                r === 0 || r === '0' ? 'bg-zinc-700 text-zinc-400' : 'bg-emerald-700 text-white'
              }`}>{r}</div>
            ))}
          </div>

          {/* ── Expandable Full Scorecard ── */}
          {(match.allBatsmen && match.allBatsmen.length > 0) && (
            <div className="border-t border-zinc-800 pt-3">
              <button
                onClick={() => setShowScorecard(!showScorecard)}
                className="flex items-center justify-between w-full text-zinc-400 hover:text-white transition-colors py-1"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">Full Scorecard</span>
                {showScorecard ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showScorecard && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {/* Batting Scorecard */}
                    <div className="mt-3">
                      <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mb-2">Batting</p>
                      <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-x-3 gap-y-1.5 text-[10px]">
                        <span className="text-zinc-600 font-bold">Batter</span>
                        <span className="text-zinc-600 font-bold text-center">R</span>
                        <span className="text-zinc-600 font-bold text-center">B</span>
                        <span className="text-zinc-600 font-bold text-center">4s</span>
                        <span className="text-zinc-600 font-bold text-center">6s</span>
                        {match.allBatsmen!.map((b, i) => (
                          <div key={i} className="contents">
                            <span className={`font-semibold truncate ${b.isActive ? 'text-emerald-400' : b.howOut ? 'text-zinc-500' : 'text-white'}`}>
                              {b.name} {b.isActive ? '★' : ''}
                            </span>
                            <span className={`text-center font-black ${b.isActive ? 'text-emerald-400' : 'text-white'}`}>{b.runs}</span>
                            <span className="text-center text-zinc-400">{b.balls}</span>
                            <span className="text-center text-blue-400">{b.fours}</span>
                            <span className="text-center text-purple-400">{b.sixes}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bowling Scorecard */}
                    {match.allBowlers && match.allBowlers.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest mb-2">Bowling</p>
                        <div className="grid grid-cols-[1fr,auto,auto,auto,auto] gap-x-3 gap-y-1.5 text-[10px]">
                          <span className="text-zinc-600 font-bold">Bowler</span>
                          <span className="text-zinc-600 font-bold text-center">O</span>
                          <span className="text-zinc-600 font-bold text-center">R</span>
                          <span className="text-zinc-600 font-bold text-center">W</span>
                          <span className="text-zinc-600 font-bold text-center">Eco</span>
                          {match.allBowlers!.map((b, i) => (
                            <div key={i} className="contents">
                              <span className={`font-semibold truncate ${b.isActive ? 'text-orange-400' : 'text-white'}`}>
                                {b.name} {b.isActive ? '●' : ''}
                              </span>
                              <span className="text-center text-zinc-400">{b.overs}</span>
                              <span className="text-center text-white">{b.runsConceded}</span>
                              <span className={`text-center font-black ${(b.wickets || 0) >= 2 ? 'text-emerald-400' : 'text-white'}`}>{b.wickets}</span>
                              <span className="text-center text-zinc-400">{b.economy}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
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
            disabled={match.status === 'completed'}
          />
          <OddsBtn
            label={`${match.team2Short} Wins`} odds={parseFloat((match.team2WinProb / 25).toFixed(2))}
            selected={selectedOdds['match-winner'] === `${match.team2Short} Win`}
            onClick={() => onBet('match-winner', `${match.team2Short} Win`, parseFloat((match.team2WinProb / 25).toFixed(2)))}
            disabled={match.status === 'completed'}
          />
        </div>
      </div>
    </div>
  );
}
