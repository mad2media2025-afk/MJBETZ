# MJBET - Premium IPL 2026 Betting Platform

MJBET is a production-grade, real-time sports betting web application built specifically for IPL 2026. It features a dark luxury UI, live cricket API integration, and a fully functional serverless backend powered by Firebase for secure authentication, real-time wallet synchronization, and atomic transactional betting.

This document serves as the architectural blueprint and knowledge base for any Senior Full Stack Developer or AI Agent taking over or contributing to the project.

---

## 🛠 Tech Stack

**Frontend Architecture:**
* **Core:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS v3 (Custom Dark Luxury Theme: Zinc-950 + Emerald-400 / Orange accents for withdrawals / Purple for referrals)
* **Animations:** Framer Motion (Micro-interactions, spring physics popups, shake animations for validation errors)
* **Icons:** `lucide-react`

**Backend / Database (Serverless):**
* **Authentication:** Firebase Auth (Google Sign-In exclusively)
* **Database:** Cloud Firestore (NoSQL, Real-time Sync)
* **Security:** Strict Firestore Security Rules (`firestore.rules`)
* **Hosting:** Firebase Hosting (Configuration in `firebase.json` and `.firebaserc`)

**External Integrations:**
* **Live Sports Data:** `cricketdata.org` API
* **Fallback Simulation:** Offline graceful fallback simulator for match progression testing (`src/lib/cricketApi.ts`)

---

## 🏗 System Architecture & Workflows

### 1. Authentication & Onboarding
- Handled via `signInWithPopup(auth, googleProvider)` in `<LoginScreen />`.
- `App.tsx` listens to `onAuthStateChanged`.
- **First Login Activation:** Standardizes the `users/{uid}` document. Automatically generates an 8-character alphanumeric referral code using a slice of the user's Firebase UID.
- **New User Referral Entry:** If a user logs in for the very first time, `<ReferralCodeEntry />` appears, prompting them for a referrer's code to establish a link.

### 2. State & Database Schema
*   **`users/{uid}`**: Tracks `name`, `email`, `balance`, `referralCode` (string), `referralCount` (int), `referredBy` (string pointer).
*   **`deposits/{docId}`**: Tracks manual deposit requests (`uid`, `amount`, `utr`, `status`). Kept secure via security rules (users can only create `status: pending`, admins handle state changes).
*   **`bets/{docId}`**: Individual bet items (`userId`, `matchId`, `amount`, `returns`, `status: pending | won | lost`).
*   **`referrals/{docId}`**: Tracks referral lifecycle (`referrerUid`, `refereeUid`, `status: pending | rewarded`).

### 3. Atomic Betting Engine
- **Placing Bets:** Handled via Firestore `runTransaction` inside `App.tsx`. Before deducting balance or creating a bet, the transaction explicitly verifies if UI tampering occurred (e.g., checking if `balance < totalStake`).
- **Settlement Engine:** Located in `src/lib/settleBets.ts`. Relies on Firestore `writeBatch` to autonomously settle multiple `pending` bets based on live match outcome loops.
- Both operations are locked down via `firestore.rules` allowing safe client-side execution without needing Cloud Functions.

### 4. Admin Approvals & Bonus Mechanics
- **Admin Authentication:** The `<AdminDashboard />` is protected by checking if the user UID matches specific hardcoded admin UIDs, backing up the protection within `firestore.rules`.
- **Deposit Bonus:** Under `<AdminDashboard />`, approving a pending deposit invokes:
  1. Grants the user an automatic **200% Welcome Bonus** (`deposit.amount * 2`).
  2. Resolves any `pending` referrals attached to the depositing user.
- **Referral Payout Logic (Atomic):**
  - **Referrer:** Receives an instant `₹1,000` boost to their wallet and `referralCount` increments.
  - **Referee (Depositor):** Receives an extra `₹100` bonus for using a code.
  - The referral document is flipped from `pending` -> `rewarded` so payouts don't duplicate.

### 5. Financial Interfaces (UI/UX)
- **Minimums & Maximums:** Strict ₹250 deposit minimums. Withdrawals require at least ₹500 and cannot exceed existing balance.
- **Withdrawal Constraints:** Users must enter a mathematically validated UPI format string (e.g., `user@bank`). Empty/invalid fields instantly trigger a visual Framer Motion horizontal shake.
- **Wagering Rule:** Disclaimers warn the user underneath the withdrawal button that bonus credits cannot simply be immediately withdrawn prior to wagering.

### 6. Sub-components & Virality Logic
- `<ReferralPopup />`: Pops up specifically if a user hits the 'X' on the Deposit modal prior to committing. Engineered for virality—contains dynamic multi-platform share URLs (WhatsApp, Telegram, FB, SMS) pre-filled with their raw code, their custom tracked link, and a markdown list of benefits.

---

## 🗄 Project Directory Layout

```text
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx      // Deposit/Bonus approvals
│   │   ├── BetSlip.tsx             // Localstate bet storage & slip management
│   │   ├── BettingMarkets.tsx      // Next Over & Match Winner UI logic
│   │   ├── DepositPopup.tsx        // Manual UPI flow w/ 2x preview
│   │   ├── Header.tsx              // Tracking real-time wallet sync 
│   │   ├── LiveMatch.tsx           // Match scoreboard UI
│   │   ├── LoginScreen.tsx         // Google Auth & 200% bonus banner
│   │   ├── ReferralCodeEntry.tsx   // New user entry flow
│   │   ├── ReferralPopup.tsx       // Sticky share component + dynamic intents
│   │   └── WithdrawPopup.tsx       // Secure cashout validations
│   ├── lib/
│   │   ├── cricketApi.ts           // API wrapper & simulation framework
│   │   ├── firebase.ts             // Auth, Firestore instantiation
│   │   └── settleBets.ts           // Transaction batch logic
│   ├── App.tsx                     // Root Orchestrator (Auth, Dialog states, Bets)
│   ├── main.tsx                    // Vite Entry
│   ├── index.css                   // Tailwind Directives
│   └── types.ts                    // Core TypeScript interface definitions
├── firestore.rules                 // Core security layer for atomic logic
├── package.json                    // Node modules / Vite
├── tsconfig...                     // Typescript transpilation configurations
└── firebase.json / .firebaserc     // Firebase hosting & rule deployment configs
```

## 🚨 Guidelines for AI Agents & Developers

1. **Firestore Constraints:** Before introducing new balance mutations (e.g., promo codes, cashbacks), ensure that `firestore.rules` is updated. Any operation attempting to modify the `balance` property outside an admin rule or an approved transaction will be hard-rejected.
2. **State Management:** Wallet balance is synced in real-time (`onSnapshot` in `App.tsx`). Do not rely on local `balance` additions or deductions to maintain truth; execute the Firestore transaction and let the `onSnapshot` listener automatically re-render the components.
3. **UI/Aesthetics:** Any new components MUST adhere to the dark theme guidelines (`bg-zinc-900`/`bg-zinc-950`). Use Framer Motion (`<motion.div>`) for modal popups rather than standard CSS displays to maintain the premium application feel.
4. **Environment:** Ensure `.env` is loaded with proper Firebase configurations before running `npm run dev` or tests.
