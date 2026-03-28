/**
 * cricketApi.ts — Live Cricket Match Fetcher
 * Polls public cricket API for live IPL/International matches.
 * Includes a graceful fallback simulator if API limit is reached or no matches are live.
 */
import type { LiveMatch } from '../types';

// NOTE: This uses a demo key from Free Cricket API / cricapi.com or similar.
// In production, this should be an environment variable.
const API_KEY = import.meta.env.VITE_CRICKET_API_KEY || "5c282893-725b-4b59-97dd-ddc4859af28b"; 
const API_URL = import.meta.env.VITE_CRICKET_API_URL || "https://api.cricketdata.org/v1/currentMatches"; 

const isMatchLive = (matchData: any) => matchData.matchStarted && !matchData.matchEnded;

// Fallback dummy data if API fails or no live matches
export const getSimulatedFallback = (prevMatch: LiveMatch): LiveMatch => {
  const runs = Math.floor(Math.random() * 6);
  const isWicket = Math.random() > 0.9;
  const isBoundary = Math.random() > 0.8 && !isWicket;
  
  const score1 = prevMatch.score1 + (isWicket ? 0 : runs);
  const wickets1 = prevMatch.wickets1 + (isWicket ? 1 : 0);
  const overs = parseFloat((prevMatch.overs + 0.1).toFixed(1));
  const crr = score1 / prevMatch.overs;
  
  const newBall = isWicket ? 'W' : (isBoundary ? '4' : '1');
  const prevRuns = [...prevMatch.lastOverRuns];
  if (prevRuns.length >= 6) prevRuns.shift();
  prevRuns.push(newBall);

  return {
    ...prevMatch,
    score1,
    wickets1,
    overs,
    crr: parseFloat(crr.toFixed(2)),
    lastBall: newBall,
    lastOverRuns: prevRuns,
    batsmen: [
      { 
        ...prevMatch.batsmen[0], 
        runs: prevMatch.batsmen[0].runs + (isWicket ? 0 : (isBoundary ? 4 : Math.floor(runs/2))),
        balls: prevMatch.batsmen[0].balls + 1
      },
      prevMatch.batsmen[1]
    ]
  };
};

/**
 * Fetches the latest live match data.
 * If finding a real match fails, it returns the fallback simulated block.
 */
export const fetchLiveMatchData = async (prevMatch: LiveMatch): Promise<LiveMatch> => {
  try {
    const res = await fetch(`${API_URL}?apikey=${API_KEY}&offset=0`);
    if (!res.ok) throw new Error("API Limit Reached or Down");
    
    const json = await res.json();
    if (json.status !== "success" || !json.data || json.data.length === 0) {
       return getSimulatedFallback(prevMatch); 
    }

    const liveMatch = json.data.find(isMatchLive);
    if (!liveMatch) return getSimulatedFallback(prevMatch);

    const t1 = liveMatch.teamInfo[0];
    const t2 = liveMatch.teamInfo[1];
    const t1ScoreStr = liveMatch.score.find((s: any) => s.inning.includes(t1.name)) || { r: prevMatch.score1, w: prevMatch.wickets1, o: prevMatch.overs };
    const t2ScoreStr = liveMatch.score.find((s: any) => s.inning.includes(t2.name)) || { r: 0, w: 0, o: 0 };

    return {
      team1: t1.name || prevMatch.team1,
      team2: t2.name || prevMatch.team2,
      team1Short: t1.shortname || prevMatch.team1Short,
      team2Short: t2.shortname || prevMatch.team2Short,
      team1Color: prevMatch.team1Color,
      team2Color: prevMatch.team2Color,
      score1: t1ScoreStr.r,
      wickets1: t1ScoreStr.w,
      overs: t1ScoreStr.o,
      totalOvers: 20,
      target: t2ScoreStr.r > 0 ? t2ScoreStr.r + 1 : prevMatch.target,
      crr: parseFloat((t1ScoreStr.r / t1ScoreStr.o || 0).toFixed(2)),
      rrr: prevMatch.rrr,
      team1WinProb: prevMatch.team1WinProb,
      team2WinProb: prevMatch.team2WinProb,
      lastOverRuns: prevMatch.lastOverRuns,
      batsmen: prevMatch.batsmen,
      bowler: prevMatch.bowler,
      lastBall: "1"
    };
  } catch (e) {
    console.warn("Live Cricket API Failed, rolling back to offline simulator.", e);
    return getSimulatedFallback(prevMatch);
  }
};
