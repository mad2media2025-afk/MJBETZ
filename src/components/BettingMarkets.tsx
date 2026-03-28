/**
 * BettingMarkets.tsx — All betting categories for the live match
 * Sections: Over-by-Over, Next Ball, Session, Player Bets
 */
import { motion } from 'framer-motion';
import { Zap, Target, BarChart3, User } from 'lucide-react';

interface Props {
  selectedOdds: Record<string, string>;
  onBet: (market: string, label: string, odds: number) => void;
  status?: string;
}

interface MarketOption {
  label: string; odds: number;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
  markets: { id: string; title: string; options: MarketOption[] }[];
  selectedOdds: Record<string, string>;
  onBet: (market: string, label: string, odds: number) => void;
}

function Section({ icon, title, badge, markets, selectedOdds, onBet }: SectionProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">{icon}</div>
        <h3 className="font-black text-base tracking-wide">{title}</h3>
        {badge && (
          <span className="ml-auto text-[9px] font-black bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/30">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-3">
        {markets.map(m => (
          <div key={m.id}>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">{m.title}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {m.options.map(opt => {
                const selected = selectedOdds[m.id] === opt.label;
                return (
                  <motion.button
                    key={opt.label}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onBet(m.id, opt.label, opt.odds)}
                    className={`flex flex-col items-center py-3 px-2 rounded-xl border transition-all ${
                      selected
                        ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.12)]'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-emerald-500/40'
                    }`}
                  >
                    <span className="text-[10px] text-zinc-400 text-center leading-tight mb-1">{opt.label}</span>
                    <span className={`text-base font-black ${selected ? 'text-emerald-400' : 'text-orange-400'}`}>
                      {opt.odds}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BettingMarkets({ selectedOdds, onBet, status }: Props) {
  return (
    <div className="space-y-4">

      {/* Live Only Markets */}
      {status !== 'pre-match' && (
        <>
          {/* Over-By-Over */}
          <Section
            icon={<BarChart3 className="w-4 h-4" />}
        title="Over-by-Over Betting"
        badge="POPULAR"
        selectedOdds={selectedOdds}
        onBet={onBet}
        markets={[
          {
            id: 'ovo-runs',
            title: 'Runs in Next Over',
            options: [
              { label: 'Under 8.5', odds: 1.85 },
              { label: 'Over 8.5',  odds: 1.95 },
            ],
          },
          {
            id: 'ovo-wicket',
            title: 'Wicket in Next Over',
            options: [
              { label: 'Yes – Wicket', odds: 2.40 },
              { label: 'No Wicket',   odds: 1.58 },
            ],
          },

        ]}
      />

      {/* Next Ball */}
      <Section
        icon={<Zap className="w-4 h-4" />}
        title="Next Ball Betting"
        badge="FAST"
        selectedOdds={selectedOdds}
        onBet={onBet}
        markets={[
          {
            id: 'next-ball',
            title: 'What will the next ball be?',
            options: [
              { label: '4 (Four)',    odds: 4.50 },
              { label: '6 (Six)',     odds: 6.00 },
              { label: 'Wicket',      odds: 7.50 },
              { label: 'Dot Ball',    odds: 2.10 },
              { label: '1 Run',       odds: 3.20 },
              { label: '2–3 Runs',    odds: 3.80 },
            ],
          },
        ]}
      />
      </>
      )}

      {/* Session Betting */}
      <Section
        icon={<Target className="w-4 h-4" />}
        title="Session Betting"
        selectedOdds={selectedOdds}
        onBet={onBet}
        markets={[
          {
            id: 'session-6',
            title: 'Runs in Next 6 Overs',
            options: [
              { label: 'Under 48.5', odds: 1.90 },
              { label: 'Over 48.5',  odds: 1.90 },
            ],
          },
          {
            id: 'session-total',
            title: 'Total Innings Score',
            options: [
              { label: 'Under 170',   odds: 2.00 },
              { label: '170–190',     odds: 2.50 },
              { label: 'Over 190',    odds: 3.00 },
            ],
          },
        ]}
      />

      {/* Player Bets */}
      <Section
        icon={<User className="w-4 h-4" />}
        title="Player Bets"
        selectedOdds={selectedOdds}
        onBet={onBet}
        markets={[
          {
            id: 'player-top-bat',
            title: 'Top Batsman',
            options: [
              { label: 'Virat Kohli',   odds: 2.10 },
              { label: 'Faf du Plessis',odds: 3.40 },
              { label: 'Travis Head',   odds: 4.00 },
            ],
          },
          {
            id: 'player-50plus',
            title: 'Player to Score 50+',
            options: [
              { label: 'Kohli 50+',  odds: 1.85 },
              { label: 'Head 50+',   odds: 2.90 },
              { label: 'No 50+',     odds: 2.40 },
            ],
          },
          {
            id: 'player-top-bowl',
            title: 'Top Bowler',
            options: [
              { label: 'Siraj 3+W',    odds: 3.50 },
              { label: 'Bhuvi 2+W',    odds: 2.80 },
              { label: 'Other Bowler', odds: 2.20 },
            ],
          },
        ]}
      />
    </div>
  );
}
