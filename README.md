# MJBET - Premium IPL 2026 Betting Platform

MJBET is a production-grade, real-time sports betting web application built specifically for IPL 2026. It features a dark luxury UI, live cricket API integration via SportsMonks, and a fully functional serverless backend powered by Firebase for secure authentication, real-time wallet synchronization, and atomic transactional betting algorithms.

This document serves as the **comprehensive architectural blueprint** and knowledge base for any Full Stack Developer or AI Agent taking over or contributing to the project.

---

## 🛠 Tech Stack

**Frontend Architecture:**
* **Core Framework:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS v4 (Custom Dark Luxury Theme: `zinc-950` with `emerald-400` primary accents, dynamic red/green odds coloring)
* **Animations:** Framer Motion (Micro-interactions, spring physics popups, shake animations for validation errors, marquee banners)
* **Icons:** `lucide-react`
* **Routing:** `react-router-dom` v7

**Backend / Database (Serverless via Firebase):**
* **Authentication:** Firebase Auth (Exclusive Google Sign-In)
* **Database:** Cloud Firestore (NoSQL, Real-time Sync listeners mapped directly to React state)
* **Security Layer:** Strict Firestore Security Rules (`firestore.rules`) enforcing atomic constraints without needing traditional Cloud Functions.
* **Hosting:** Firebase Hosting ready configuration.

**External API Integrations:**
* **Live Sports Data:** `SportsMonks Cricket API v2/v3` (live scores, wickets, overs, and run rates).
* **Fallback Simulation:** Offline graceful fallback simulator logic inside `src/lib/cricketApi.ts` to mock live match progression if the API limit is reached or no matches are currently active.

---

## 🏗 System Architecture & Workflows

### 1. Authentication & Onboarding
- Fired via `signInWithPopup(auth, googleProvider)` inside `<LoginScreen />`.
- `App.tsx` listens globally to `onAuthStateChanged`.
- **First Login Activation:** Standardizes the `users/{uid}` document. Automatically generates an 8-character alphanumeric referral code using a slice of the user's secure Firebase UID.
- **Referral Entry:** New users are greeted with `<ReferralCodeEntry />` to input a referrer's code to establish a link in the `referrals` collection.

### 2. State & Database Schema
*   **`users/{uid}`**: Primary user profile. Tracks `name`, `email`, `balance` (Number), `referralCode` (String), `referralCount` (Int), `isAdmin` (Boolean), `referredBy` (String pointer).
*   **`deposits/{docId}`**: Tracks manual deposit requests (`uid`, `amount`, `utr`, `status`). Governed by security rules (users create `status: pending`, only admins mutate state).
*   **`placedBets/{uid}/bets/{betId}`**: Subcollection of individual bet slips (`userId`, `market`, `label`, `odds`, `stake`, `timestamp`, `status: pending | won | lost`).
*   **`referrals/{docId}`**: Tracks referral lifecycle (`referrerUid`, `refereeUid`, `status: pending | rewarded`).

### 3. The Atomic Betting Engine (`src/lib/settleBets.ts`)
- **Placing Bets:** Handled via Firestore `runTransaction` inside `App.tsx`. Before deducting the user balance or creating a bet document, the transaction explicitly verifies if UI state tampering occurred (e.g., verifying if `balance >= totalStake`).
- **Settlement Engine:** Located in `src/lib/settleBets.ts`. When a match completes or UI probability triggers, the engine queries all `pending` bets for a standard `uid`.
  - Maps `bet.label` dynamically against the winning `winnerLabel`.
  - Relies on Firestore `writeBatch` to autonomously settle multiple bets at once.
  - If WON: Balance is incremented (`increment(payout)`), bet status flips to `won`.
  - If LOST: Bet status flips to `lost`.
- **Security Constraint:** Locked down via `firestore.rules`. Clients can *only* write inside the transaction boundary or batch write if they are modifying the `balance` property securely. They cannot manipulate betting odds post-creation.

### 4. Admin Approvals & Bonus Mechanics
- **Admin Authorisation:** The `<AdminDashboard />` is protected by `isAdmin` claims in the Firestore document alongside hardcoded UID secondary checks.
- **Deposit Bonus Processing:** Approving a pending deposit (`amount * X`) invokes:
  1. Grants the user an automatic **200% Welcome Bonus**.
  2. Resolves any `pending` referrals attached to the depositing user.
- **Referral Payout Logic (Atomic):**
  - **Referrer:** Receives an instant `₹1,000` boost to their wallet and `referralCount` increments.
  - **Referee (Depositor):** Receives an extra `₹100` bonus for using a code.
  - The `status` on the referral document is flipped from `pending` -> `rewarded` so payouts won't duplicate on secondary deposits.

### 5. Financial Interfaces (UI/UX)
- **Modals:** Built with Framer Motion `<motion.div>` for fluid entry/exit.
- **Minimums & Maximums:** Strict minimums enforced (e.g. ₹250 deposit).
- **Withdrawal Engine:** `<WithdrawPopup />` checks if withdrawal exceeds `user_balance`. Requires mathematically validated UPI formats (e.g., `value@bank`). Invalid formats trigger a visual vibration/shake animation and reject the payload.

### 6. Sub-components & Virality Logic
- `<ReferralPopup />`: Engineered for organic virality. Contains dynamic cross-platform share URLs (WhatsApp, Telegram, Facebook, SMS) pre-filled with the user's referral code and promotional text. Often appears organically on app interaction blocks.
- **Global Banners:** Auto-scrolling, Framer Motion-powered marquee banners in `Header.tsx` and Footer simulating live platform trust stats.

---

## 🗄 Project Directory Layout

```text
├── src/
│   ├── components/
│   │   ├── AdminDashboard.tsx      // Deposit/Bonus approvals, global ledger
│   │   ├── BetSlip.tsx             // Local transient state for building parlays/slips
│   │   ├── BettingMarkets.tsx      // Generates dynamic odds mapping from LiveMatch
│   │   ├── DepositPopup.tsx        // Manual UPI QR validation flow
│   │   ├── Header.tsx              // Main nav, marquee banners, wallet sync display
│   │   ├── LiveMatch.tsx           // Match scoreboard UI utilizing SportsMonk payload
│   │   ├── LoginScreen.tsx         // Google Auth gateway & Welcome Offer UI
│   │   ├── ReferralCodeEntry.tsx   // Initial Onboarding promo entry parser
│   │   ├── ReferralPopup.tsx       // Sticky share component + dynamic deep links
│   │   └── WithdrawPopup.tsx       // Secure cashout validations & UPI checking
│   ├── lib/
│   │   ├── cricketApi.ts           // SportsMonk API fetcher & offline payload simulator
│   │   ├── firebase.ts             // Firebase App initialization & DB exports
│   │   └── settleBets.ts           // Batch transaction logic for result resolutions
│   ├── App.tsx                     // Root Orchestrator (Auth Listener, Routing, State)
│   ├── main.tsx                    // React DOM entry
│   ├── index.css                   // Tailwind @theme config & Custom Animations
│   └── types.ts                    // Core TypeScript interfaces (LiveMatch, User, PlacedBet)
├── firestore.rules                 // Core security layer for atomic logic (CRITICAL)
├── package.json                    // Node dependencies & scripts
├── vite.config.ts                  // Vite bundler configuration
└── firebase.json / .firebaserc     // Firebase hosting & deploy targets
```

---

## 🚨 Guidelines for AI Agents & Developers

1. **Firestore Constraints:** Before introducing new balance mutations (e.g., promo codes, cashbacks), ensure that `firestore.rules` is updated. Any operation attempting to modify the `balance` property outside an admin rule, or mutating an array of locked properties, *will* trigger a `FirebaseError: Missing or insufficient permissions.`.
2. **State Management Protocol:** Wallet balance is synced dynamically in real-time (`onSnapshot` in `App.tsx`). Do not rely on local React state `setBalance(balance - amount)` to maintain truth; execute the `runTransaction` into Firestore and let the `onSnapshot` listener automatically re-render the components.
3. **UI/Aesthetics:** Any new components MUST adhere to the dark theme guidelines (`bg-zinc-900`/`bg-zinc-950`). Use Framer Motion (`<motion.div>`) for modal popups rather than standard CSS block displays to maintain the premium fluid application feel.
4. **API Mapping Compatibility:** The `cricketApi.ts` relies on the SportsMonks JSON schema (`data[0].localteam`, `data[0].runs`, etc.). If modifying betting markets, ensure the variables correctly interface with the `LiveMatch` object mapped in `types.ts`.

---

## 🔐 Environment Setup

To run this application locally, you must provide `.env` configuration.
Create a `.env` file at the root:

```bash
# LIVE API DATA KEY
VITE_SPORTSMONK_API_KEY="your-sportsmonk-live-api-key"
VITE_CRICKET_API_URL="https://cricket.sportmonks.com/api/v2.0/livescores"
```

Firebase config is intentionally hardcoded directly in `src/lib/firebase.ts` as Firebase web client configurations are meant to be public and are secured via the Backend `firestore.rules`.

## 🚀 Running Locally

```bash
# Install Modules
npm install

# Start Vite Dev Server (HMR enabled)
npm run dev
```

## 📱 Mobile Optimization Notes

- All interactive deposit/withdrawal elements meet the `44px` minimum touch target standard for iOS/Android compliance.
- Root `overflow-x-hidden` on the `<main>` wrapper prevents horizontal scroll bleed on narrow viewports that might occur from the live marquee banner.
- Match `status` field (`'pre-match' | 'live'`) controls conditional UI branching in `LiveMatch.tsx` and dynamically hides or reveals contextual betting markets in `BettingMarkets.tsx` to prevent placing bets on dead matches.
