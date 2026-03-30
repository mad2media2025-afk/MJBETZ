// Shared types used across all components

export interface User {
  name: string;
  email: string;
  avatar: string; // initials or URL
  uid: string;    // required — set from Firebase Auth
  referralCode?: string; // unique code for this user
  referralCount?: number; // number of friends who deposited ₹250+ via their code
  referredBy?: string;   // uid of the user who referred them
  balance?: number;      // user's wallet balance
  isAdmin?: boolean;     // admin flag
  createdAt?: number | string; // account creation timestamp
}

export interface LiveMatch {
  status?: 'pre-match' | 'live' | 'completed';
  startTime?: string;
  team1: string;
  team2: string;
  team1Short: string;
  team2Short: string;
  team1Color: string;
  team2Color: string;
  score1: number;
  wickets1: number;
  overs: number;
  totalOvers: number;
  target: number;
  crr: number;
  rrr: number;
  team1WinProb: number;
  team2WinProb: number;
  lastOverRuns: (number | string)[];
  batsmen: { name: string; runs: number; balls: number; fours: number; sixes: number; strikeRate?: number; isStriker?: boolean }[];
  bowler: { name: string; overs: string; wickets: number; economy: number; runsConceded?: number; maidens?: number };
  lastBall: string;
  // New fields for full live integration
  fixtureId?: number;
  currentInnings?: number;         // 1 or 2
  battingTeamId?: number;          // which team is batting
  score2?: number;                 // 2nd innings score (or 1st innings final when chasing)
  wickets2?: number;
  overs2?: number;
  matchNote?: string;              // e.g. "CSK need 45 runs in 30 balls"
  liveOdds1?: number;              // Dynamic odds for team 1
  liveOdds2?: number;              // Dynamic odds for team 2
  team1Id?: number;
  team2Id?: number;
  allBatsmen?: { name: string; runs: number; balls: number; fours: number; sixes: number; strikeRate?: number; howOut?: string; isActive?: boolean }[];
  allBowlers?: { name: string; overs: string; wickets: number; economy: number; runsConceded?: number; maidens?: number; isActive?: boolean }[];
  isLiveFromApi?: boolean;         // true when data is from real API (not simulation)
  result?: string;                 // Final result summary (e.g. "team wins by X wkts")
  potm?: string;                   // Player of the Match
}

export interface BetSlipItem {
  id: string;
  market: string;
  label: string;
  odds: number;
  stake: number;
}

export interface PlacedBet {
  id: string;
  market: string;
  label: string;
  odds: number;
  stake: number;
  status: 'won' | 'lost' | 'pending' | 'refunded';
  timestamp: number;
  // Firestore extensions
  matchId?: string;
  matchLabel?: string;
  createdAt?: number;
  uid?: string;
}

export interface DepositRequest {
  id: string;
  uid: string;
  userEmail: string;
  amount: number;
  utr: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

export interface BetSlipCtx {
  betSlip: BetSlipItem[];
  selectedOdds: Record<string, string>;
  addToBetSlip: (market: string, label: string, odds: number) => void;
  removeFromSlip: (id: string) => void;
  updateStake: (id: string, stake: number) => void;
  totalStake: number;
  totalReturn: number;
}
