/**
 * settleBets.ts — Bet Settlement Engine
 * Evaluates pending bets vs. a match winner and updates Firestore atomically.
 * Called from App.tsx when team win probability crosses the settlement threshold.
 */

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PlacedBet } from '../types';

/**
 * Settles all pending bets for a user based on the match winner.
 *
 * @param uid         - Firebase Auth UID
 * @param winnerLabel - The winning team name/label (e.g. "RCB Win", "MI")
 *
 * Settlement rule:
 *   bet.label (case-insensitive) contains any word from winnerLabel → WON
 *   otherwise → LOST
 *
 * On WIN: user balance is credited with (stake * odds)
 * Uses a Firestore batch to commit all updates atomically.
 */
export async function settlePendingBets(
  uid: string,
  winnerLabel: string,
): Promise<{ won: number; lost: number; totalPayout: number }> {
  const betsRef = collection(db, 'placedBets', uid, 'bets');
  const pendingQ = query(betsRef, where('status', '==', 'pending'));
  const snap = await getDocs(pendingQ);

  if (snap.empty) return { won: 0, lost: 0, totalPayout: 0 };

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', uid);

  const winnerLower = winnerLabel.toLowerCase();
  let wonCount = 0;
  let lostCount = 0;
  let totalPayout = 0;

  snap.forEach((betDoc) => {
    const bet = betDoc.data() as PlacedBet;
    const betLower = bet.label.toLowerCase();

    // Check if the bet label matches any word from the winner string
    const isWon = winnerLower
      .split(/[\s,]+/)
      .some((word) => word.length > 1 && betLower.includes(word));

    const betRef = doc(betsRef, betDoc.id);

    if (isWon) {
      const payout = Math.floor(bet.stake * bet.odds);
      batch.update(betRef, { status: 'won' });
      batch.update(userRef, { balance: increment(payout) });
      wonCount++;
      totalPayout += payout;
    } else {
      batch.update(betRef, { status: 'lost' });
      lostCount++;
    }
  });

  await batch.commit();
  return { won: wonCount, lost: lostCount, totalPayout };
}
