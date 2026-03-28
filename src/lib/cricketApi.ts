/**
 * cricketApi.ts — Live Cricket Match Fetcher (SportsMonks v2.0)
 * 
 * Polls SportsMonks Cricket API v2.0 for live IPL/International matches.
 * Maps full batting, bowling, runs, and team data into the app's LiveMatch model.
 * Includes a graceful fallback simulator if API is down or no matches are live.
 * 
 * API Docs: https://docs.sportmonks.com/cricket
 * Endpoint: /livescores with includes: localteam,visitorteam,runs,batting.batsman,bowling.bowlman
 */
import type { LiveMatch } from '../types';

const API_KEY = import.meta.env.VITE_SPORTSMONK_API_KEY || "";
// In dev, use Vite proxy to bypass CORS. In production, call SportsMonks directly.
const API_BASE = import.meta.env.DEV ? '/api/cricket' : (import.meta.env.VITE_CRICKET_API_URL || "https://cricket.sportmonks.com/api/v2.0");

// ── IPL Team Metadata (short codes + brand colors) ──────────────────────────
const IPL_TEAMS: Record<string, { short: string; color: string }> = {
  'Royal Challengers Bengaluru': { short: 'RCB', color: '#EC1C24' },
  'Royal Challengers Bangalore': { short: 'RCB', color: '#EC1C24' },
  'Chennai Super Kings':         { short: 'CSK', color: '#FFCB05' },
  'Mumbai Indians':              { short: 'MI',  color: '#004BA0' },
  'Kolkata Knight Riders':       { short: 'KKR', color: '#3A225D' },
  'Sunrisers Hyderabad':         { short: 'SRH', color: '#F26522' },
  'Rajasthan Royals':            { short: 'RR',  color: '#E73895' },
  'Delhi Capitals':              { short: 'DC',  color: '#0078BC' },
  'Punjab Kings':                { short: 'PBKS', color: '#ED1B24' },
  'Gujarat Titans':              { short: 'GT',  color: '#1B2133' },
  'Lucknow Super Giants':        { short: 'LSG', color: '#A72056' },
};

function getTeamMeta(name: string, code?: string) {
  const meta = IPL_TEAMS[name];
  return {
    short: meta?.short || code || name.slice(0, 3).toUpperCase(),
    color: meta?.color || '#10b981',
  };
}

// ── Fallback Simulator ──────────────────────────────────────────────────────
export const getSimulatedFallback = (prevMatch: LiveMatch): LiveMatch => {
  const runs = Math.floor(Math.random() * 7); // 0–6
  const isWicket = Math.random() > 0.9;
  const isSix = !isWicket && runs === 6;
  const isFour = !isWicket && !isSix && Math.random() > 0.8;

  const actualRuns = isWicket ? 0 : (isFour ? 4 : (isSix ? 6 : (runs <= 3 ? runs : 1)));
  const score1 = prevMatch.score1 + actualRuns;
  const wickets1 = prevMatch.wickets1 + (isWicket ? 1 : 0);
  const overs = parseFloat((prevMatch.overs + 0.1).toFixed(1));
  // Fix overs: after x.5, next is (x+1).0
  const adjustedOvers = overs % 1 >= 0.6 ? Math.ceil(overs) : overs;
  const crr = adjustedOvers > 0 ? score1 / adjustedOvers : 0;

  const newBall = isWicket ? 'W' : (isSix ? '6' : (isFour ? '4' : String(actualRuns)));
  const prevRuns = [...prevMatch.lastOverRuns];
  if (prevRuns.length >= 6) prevRuns.shift();
  prevRuns.push(newBall);

  return {
    ...prevMatch,
    score1,
    wickets1,
    overs: adjustedOvers,
    crr: parseFloat(crr.toFixed(2)),
    lastBall: newBall,
    lastOverRuns: prevRuns,
    isLiveFromApi: false,
    batsmen: [
      {
        ...prevMatch.batsmen[0],
        runs: prevMatch.batsmen[0].runs + (isWicket ? 0 : actualRuns),
        balls: prevMatch.batsmen[0].balls + 1,
        fours: prevMatch.batsmen[0].fours + (isFour ? 1 : 0),
        sixes: prevMatch.batsmen[0].sixes + (isSix ? 1 : 0),
      },
      prevMatch.batsmen[1]
    ]
  };
};

// ── API Response Type Definitions (SportsMonks v2.0 Schema) ─────────────────
interface SMBatsman {
  resource?: string;
  id?: number;
  fixture_id?: number;
  team_id?: number;
  active?: boolean;
  scoreboard?: string;
  player_id?: number;
  ball?: number;
  score?: number;
  four_x?: number;
  six_x?: number;
  rate?: number;
  fow_score?: number;
  fow_balls?: number;
  catch_stump_player_id?: number | null;
  bowling_player_id?: number | null;
  batsman?: { id?: number; fullname?: string; firstname?: string; lastname?: string };
}

interface SMBowler {
  resource?: string;
  id?: number;
  fixture_id?: number;
  team_id?: number;
  active?: boolean;
  scoreboard?: string;
  player_id?: number;
  overs?: number;
  medians?: number;
  runs?: number;
  wickets?: number;
  wide?: number;
  noball?: number;
  rate?: number;
  bowlman?: { id?: number; fullname?: string; firstname?: string; lastname?: string };
  // v3 uses "bowler" instead of "bowlman"
  bowler?: { id?: number; fullname?: string; firstname?: string; lastname?: string };
}

interface SMRuns {
  resource?: string;
  id?: number;
  fixture_id?: number;
  team_id?: number;
  inning?: number;
  score?: number;
  wickets?: number;
  overs?: number;
  pp1?: string;
  pp2?: string | null;
  pp3?: string | null;
}

interface SMTeam {
  id?: number;
  name?: string;
  code?: string;
  image_path?: string;
}

interface SMFixture {
  id?: number;
  league_id?: number;
  season_id?: number;
  round?: string;
  localteam_id?: number;
  visitorteam_id?: number;
  starting_at?: string;
  type?: string;
  live?: boolean;
  status?: string;       // "NS", "1st Innings", "2nd Innings", "Finished", "Innings Break", "Abandoned", etc.
  note?: string;         // e.g., "Team A won by 5 wickets"
  toss_won_team_id?: number;
  elected?: string;
  localteam?: SMTeam;
  visitorteam?: SMTeam;
  runs?: SMRuns[];
  batting?: SMBatsman[];
  bowling?: SMBowler[];
}

// ── Map API Status to App Status ─────────────────────────────────────────────
function mapStatus(apiStatus?: string): 'pre-match' | 'live' | 'completed' {
  if (!apiStatus) return 'pre-match';
  const s = apiStatus.toLowerCase();
  if (s === 'ns' || s === 'not started') return 'pre-match';
  if (s === 'finished' || s === 'aban.' || s === 'abandoned' || s === 'cancelled') return 'completed';
  // "1st innings", "2nd innings", "innings break", "stumps", etc. are all live
  return 'live';
}

// ── Calculate Win Probability (based on match situation) ─────────────────────
function calculateWinProb(
  battingScore: number, wicketsLost: number, oversBowled: number,
  totalOvers: number, target: number, innings: number
): { battingTeamProb: number; bowlingTeamProb: number } {
  if (innings === 1) {
    // 1st innings: roughly 50-50, slight edge based on run rate
    const projectedScore = oversBowled > 0 ? (battingScore / oversBowled) * totalOvers : 150;
    const wicketPenalty = wicketsLost * 5;
    const normalizedScore = Math.min(Math.max(projectedScore - wicketPenalty, 80), 250);
    const prob = Math.min(Math.max(Math.round(normalizedScore / 3.3), 20), 80);
    return { battingTeamProb: prob, bowlingTeamProb: 100 - prob };
  }

  // 2nd innings chase
  if (target <= 0) return { battingTeamProb: 50, bowlingTeamProb: 50 };
  const runsNeeded = target - battingScore;
  const ballsLeft = Math.max((totalOvers - oversBowled) * 6, 1);
  const wicketsLeft = 10 - wicketsLost;

  if (runsNeeded <= 0) return { battingTeamProb: 100, bowlingTeamProb: 0 };
  if (wicketsLeft <= 0) return { battingTeamProb: 0, bowlingTeamProb: 100 };

  const requiredRate = (runsNeeded / ballsLeft) * 6;
  const currentRate = oversBowled > 0 ? battingScore / oversBowled : 6;
  const rateDiff = currentRate - requiredRate;
  const wicketFactor = wicketsLeft / 10;

  let prob = 50 + (rateDiff * 8) + (wicketFactor * 15) - (runsNeeded / totalOvers);
  prob = Math.min(Math.max(Math.round(prob), 2), 98);
  return { battingTeamProb: prob, bowlingTeamProb: 100 - prob };
}

// ── Get Bowler Name ──────────────────────────────────────────────────────────
function getBowlerName(b: SMBowler): string {
  // v2 uses "bowlman", v3 uses "bowler"
  return b.bowlman?.fullname || b.bowler?.fullname ||
    (b.bowlman ? `${b.bowlman.firstname || ''} ${b.bowlman.lastname || ''}`.trim() : '') ||
    (b.bowler ? `${b.bowler.firstname || ''} ${b.bowler.lastname || ''}`.trim() : '') ||
    `Bowler #${b.player_id || '?'}`;
}

// ── Get Batsman Name ─────────────────────────────────────────────────────────
function getBatsmanName(b: SMBatsman): string {
  return b.batsman?.fullname ||
    (b.batsman ? `${b.batsman.firstname || ''} ${b.batsman.lastname || ''}`.trim() : '') ||
    `Batsman #${b.player_id || '?'}`;
}

// ── Main Fetch Function ─────────────────────────────────────────────────────
/**
 * Fetches the latest live match data using SportsMonks Cricket API v2.0.
 * Includes: localteam, visitorteam, runs, batting.batsman, bowling.bowlman
 * If API fails or no live matches, returns the fallback simulated data.
 */
export const fetchLiveMatchData = async (prevMatch: LiveMatch): Promise<LiveMatch> => {
  try {
    if (!API_KEY) {
      console.warn('No SportsMonks API key configured. Using simulation.');
      return getSimulatedFallback(prevMatch);
    }

    const url = `${API_BASE}/livescores?api_token=${API_KEY}&include=localteam,visitorteam,runs,batting.batsman,bowling.bowlman`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`SportsMonks API returned ${res.status}. Falling back to simulator.`);
      return getSimulatedFallback(prevMatch);
    }

    const json = await res.json();

    if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
      console.info('No live matches from API. Falling back to simulator.');
      return getSimulatedFallback(prevMatch);
    }

    // Try to find a live match (prefer "in progress" over "not started")
    const fixtures = json.data as SMFixture[];
    const liveFixture = fixtures.find(f =>
      f.status && !['ns', 'not started', 'finished', 'aban.', 'abandoned'].includes(f.status.toLowerCase())
    ) || fixtures[0];

    if (!liveFixture) return getSimulatedFallback(prevMatch);

    return mapFixtureToLiveMatch(liveFixture, prevMatch);
  } catch (e) {
    console.warn('Live SportsMonk API Failed, falling back to offline simulator.', e);
    return getSimulatedFallback(prevMatch);
  }
};

/**
 * Maps a raw SportsMonks fixture JSON into the app's LiveMatch model.
 * This is pure data transformation with no side effects.
 */
function mapFixtureToLiveMatch(fixture: SMFixture, prevMatch: LiveMatch): LiveMatch {
  // ── Teams ──
  const t1 = fixture.localteam;
  const t2 = fixture.visitorteam;
  const t1Name = t1?.name || prevMatch.team1;
  const t2Name = t2?.name || prevMatch.team2;
  const t1Meta = getTeamMeta(t1Name, t1?.code);
  const t2Meta = getTeamMeta(t2Name, t2?.code);
  const t1Id = fixture.localteam_id || t1?.id || 0;
  const t2Id = fixture.visitorteam_id || t2?.id || 0;

  // ── Match Status ──
  const status = mapStatus(fixture.status);
  const matchNote = fixture.note || '';

  // ── Runs (innings data) ──
  const allRuns = fixture.runs || [];
  const innings1 = allRuns.find(r => r.inning === 1);
  const innings2 = allRuns.find(r => r.inning === 2);

  // Determine which innings is current
  const currentInnings = innings2 ? 2 : 1;
  const currentInningsRuns = currentInnings === 2 ? innings2 : innings1;

  const currentScore = currentInningsRuns?.score || 0;
  const currentWickets = currentInningsRuns?.wickets || 0;
  const currentOvers = currentInningsRuns?.overs || 0;

  // Previous innings data (for target calculation)
  const firstInningsScore = innings1?.score || 0;
  const target = currentInnings === 2 ? firstInningsScore + 1 : 0;

  // Determine which team is batting in current innings
  const battingTeamId = currentInningsRuns?.team_id || t1Id;
  const team1IsBatting = battingTeamId === t1Id;

  // ── Batting Data ──
  const allBatting = fixture.batting || [];
  // Filter to current innings batsmen
  const currentInningsBatsmen = allBatting.filter(b => {
    // Match by scoreboard (S1/S2) or by team_id
    if (currentInnings === 1) return b.scoreboard === 'S1' || (!b.scoreboard && b.team_id === battingTeamId);
    return b.scoreboard === 'S2' || (!b.scoreboard && b.team_id === battingTeamId);
  });

  // Currently at crease (active === true)
  const activeBatsmen = currentInningsBatsmen.filter(b => b.active === true);
  // If no active flags, take last 2 batsmen who haven't been dismissed
  const atCrease = activeBatsmen.length > 0
    ? activeBatsmen
    : currentInningsBatsmen.filter(b => !b.fow_score && !b.catch_stump_player_id).slice(-2);

  const batsmen = atCrease.length > 0
    ? atCrease.map((b, idx) => ({
      name: getBatsmanName(b),
      runs: b.score || 0,
      balls: b.ball || 0,
      fours: b.four_x || 0,
      sixes: b.six_x || 0,
      strikeRate: b.rate || (b.ball && b.ball > 0 ? parseFloat(((b.score || 0) / b.ball * 100).toFixed(1)) : 0),
      isStriker: idx === 0,
    }))
    : prevMatch.batsmen; // Keep previous if we can't find active batsmen

  // All batsmen for detailed scorecard
  const allBatsmenMapped = currentInningsBatsmen.map(b => ({
    name: getBatsmanName(b),
    runs: b.score || 0,
    balls: b.ball || 0,
    fours: b.four_x || 0,
    sixes: b.six_x || 0,
    strikeRate: b.rate || 0,
    howOut: b.catch_stump_player_id ? 'out' : (b.fow_score ? 'out' : ''),
    isActive: b.active === true,
  }));

  // ── Bowling Data ──
  const allBowling = fixture.bowling || [];
  const currentInningsBowlers = allBowling.filter(b => {
    if (currentInnings === 1) return b.scoreboard === 'S1' || (!b.scoreboard && b.team_id !== battingTeamId);
    return b.scoreboard === 'S2' || (!b.scoreboard && b.team_id !== battingTeamId);
  });

  const activeBowler = currentInningsBowlers.find(b => b.active === true)
    || currentInningsBowlers[currentInningsBowlers.length - 1]; // Last bowler is likely current

  const bowler = activeBowler
    ? {
      name: getBowlerName(activeBowler),
      overs: String(activeBowler.overs ?? 0),
      wickets: activeBowler.wickets || 0,
      economy: activeBowler.rate || (activeBowler.overs && activeBowler.overs > 0
        ? parseFloat(((activeBowler.runs || 0) / activeBowler.overs).toFixed(2))
        : 0),
      runsConceded: activeBowler.runs || 0,
      maidens: activeBowler.medians || 0,
    }
    : prevMatch.bowler;

  // All bowlers for detailed scorecard
  const allBowlersMapped = currentInningsBowlers.map(b => ({
    name: getBowlerName(b),
    overs: String(b.overs ?? 0),
    wickets: b.wickets || 0,
    economy: b.rate || 0,
    runsConceded: b.runs || 0,
    maidens: b.medians || 0,
    isActive: b.active === true,
  }));

  // ── Stats Calculation ──
  const crr = currentOvers > 0 ? parseFloat((currentScore / currentOvers).toFixed(2)) : 0;
  const ballsRemaining = Math.max((20 - currentOvers) * 6, 0);
  const rrr = currentInnings === 2 && ballsRemaining > 0
    ? parseFloat((((target - currentScore) / ballsRemaining) * 6).toFixed(2))
    : 0;

  // ── Win Probability ──
  const { battingTeamProb, bowlingTeamProb } = calculateWinProb(
    currentScore, currentWickets, currentOvers, 20, target, currentInnings
  );
  const team1WinProb = team1IsBatting ? battingTeamProb : bowlingTeamProb;
  const team2WinProb = team1IsBatting ? bowlingTeamProb : battingTeamProb;

  // ── Build the final LiveMatch ──
  return {
    status,
    startTime: fixture.starting_at,
    team1: t1Name,
    team2: t2Name,
    team1Short: t1Meta.short,
    team2Short: t2Meta.short,
    team1Color: t1Meta.color,
    team2Color: t2Meta.color,
    team1Id: t1Id,
    team2Id: t2Id,
    // Current batting team score
    score1: team1IsBatting ? currentScore : (innings1?.score || 0),
    wickets1: team1IsBatting ? currentWickets : (innings1?.wickets || 0),
    overs: currentOvers,
    totalOvers: 20,
    target,
    crr,
    rrr,
    team1WinProb,
    team2WinProb,
    // 2nd innings data
    score2: innings2?.score,
    wickets2: innings2?.wickets,
    overs2: innings2?.overs,
    // Detailed data
    currentInnings,
    battingTeamId,
    matchNote,
    fixtureId: fixture.id,
    batsmen,
    bowler,
    allBatsmen: allBatsmenMapped.length > 0 ? allBatsmenMapped : undefined,
    allBowlers: allBowlersMapped.length > 0 ? allBowlersMapped : undefined,
    // Last over — keep previous since API doesn't give ball-by-ball in livescores
    lastOverRuns: prevMatch.lastOverRuns,
    lastBall: prevMatch.lastBall,
    isLiveFromApi: true,
  };
}

/**
 * Fetches upcoming/scheduled fixtures for the next few days.
 * Useful for populating the "Upcoming Matches" tab with real data.
 */
export const fetchUpcomingFixtures = async (): Promise<SMFixture[]> => {
  try {
    if (!API_KEY) return [];

    const url = `${API_BASE}/fixtures?api_token=${API_KEY}&include=localteam,visitorteam&filter[status]=NS&sort=starting_at&per_page=10`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const json = await res.json();
    return (json.data || []) as SMFixture[];
  } catch {
    return [];
  }
};
