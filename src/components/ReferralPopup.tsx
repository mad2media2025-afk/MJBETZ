/**
 * ReferralPopup.tsx — Shown when user closes the deposit popup without depositing
 * Two separate copy boxes (link + code), social share buttons, referee ₹100 bonus info
 */
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Copy, CheckCircle, Link2, Hash } from 'lucide-react';
import { useState } from 'react';

interface Props {
  referralCode: string;
  onClose: () => void;
}

const SITE_URL = 'https://mjbet-e4ed1.web.app';

// Share message with full benefits breakdown
const buildShareText = (code: string, link: string) =>
  `🏏 *MJBET - IPL 2026 Premium Betting!*\n\n` +
  `🎁 *Exclusive Benefits for You:*\n` +
  `• 200% Welcome Bonus on first deposit\n` +
  `• Extra ₹100 bonus just for joining via referral!\n` +
  `• Live IPL matches with real-time odds\n` +
  `• Instant payouts\n\n` +
  `🔑 *My Referral Code:* ${code}\n` +
  `👉 *Sign up here:* ${link}`;

const SOCIAL_PLATFORMS = (code: string, link: string) => {
  const text = buildShareText(code, link);
  const encodedText = encodeURIComponent(text);
  const encodedLink = encodeURIComponent(link);
  return [
    {
      name: 'WhatsApp',
      bg: 'bg-green-600 hover:bg-green-500',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.934 1.395 5.608L0 24l6.517-1.376A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.002-1.368l-.358-.213-3.717.785.802-3.614-.233-.372A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182 17.43 2.182 21.818 6.57 21.818 12c0 5.43-4.388 9.818-9.818 9.818z"/>
        </svg>
      ),
      url: `https://wa.me/?text=${encodedText}`,
    },
    {
      name: 'Telegram',
      bg: 'bg-sky-500 hover:bg-sky-400',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      ),
      url: `https://t.me/share/url?url=${encodedLink}&text=${encodedText}`,
    },
    {
      name: 'Facebook',
      bg: 'bg-blue-600 hover:bg-blue-500',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
    },
    {
      name: 'Instagram',
      bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:opacity-90',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      ),
      // Instagram: copy message and open Instagram
      url: null as string | null,
      onInstagram: true,
    },
    {
      name: 'SMS',
      bg: 'bg-zinc-600 hover:bg-zinc-500',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      ),
      url: `sms:?body=${encodedText}`,
    },
  ];
};

function CopyBox({
  label,
  value,
  icon,
  successMsg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  successMsg: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="bg-zinc-950 border border-zinc-700 rounded-2xl p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
          {icon} {label}
        </p>
        <p className="text-xs text-white font-mono truncate">{value}</p>
      </div>
      <button
        onClick={handleCopy}
        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all min-w-[72px] justify-center ${
          copied
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95'
        }`}
      >
        {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? successMsg : 'Copy'}
      </button>
    </div>
  );
}

export default function ReferralPopup({ referralCode, onClose }: Props) {
  const referralLink = `${SITE_URL}/?ref=${referralCode}`;
  const platforms = SOCIAL_PLATFORMS(referralCode, referralLink);

  const handleSocialShare = (platform: typeof platforms[0]) => {
    if (platform.onInstagram) {
      // Copy text then open Instagram
      navigator.clipboard.writeText(buildShareText(referralCode, referralLink)).catch(() => {});
      window.open('https://www.instagram.com/', '_blank');
    } else if (platform.url) {
      window.open(platform.url, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className="sm:hidden bg-zinc-900 border-t border-zinc-700 rounded-t-3xl w-full shadow-2xl overflow-y-auto max-h-[92vh]"
        >
          <ReferralContent referralCode={referralCode} referralLink={referralLink} platforms={platforms} onClose={onClose} onShare={handleSocialShare} />
        </motion.div>

        {/* Desktop card */}
        <motion.div
          initial={{ scale: 0.7, y: 60 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className="hidden sm:block bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-y-auto max-h-[90vh]"
        >
          <ReferralContent referralCode={referralCode} referralLink={referralLink} platforms={platforms} onClose={onClose} onShare={handleSocialShare} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ReferralContent({
  referralCode, referralLink, platforms, onClose, onShare,
}: {
  referralCode: string;
  referralLink: string;
  platforms: ReturnType<typeof SOCIAL_PLATFORMS>;
  onClose: () => void;
  onShare: (p: ReturnType<typeof SOCIAL_PLATFORMS>[0]) => void;
}) {
  return (
    <>
      {/* Drag handle (mobile) */}
      <div className="sm:hidden flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-zinc-700" />
      </div>

      {/* Close */}
      <button onClick={onClose}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition">
        <X className="w-4 h-4" />
      </button>

      {/* Banner */}
      <div className="relative bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 px-6 pt-6 pb-8 text-center overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-full bg-white/5" />
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, -5, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          className="inline-flex items-center justify-center w-14 h-14 bg-yellow-400 rounded-2xl shadow-xl mb-3"
        >
          <Gift className="w-7 h-7 text-yellow-900" />
        </motion.div>
        <h2 className="text-2xl font-black text-white leading-none">Refer & Earn</h2>
        <p className="text-purple-200 text-xs font-bold mt-1">Everyone wins when you share MJBET!</p>

        {/* Reward pills */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <div className="bg-yellow-400 text-yellow-900 font-black text-sm px-4 py-1.5 rounded-xl shadow">
            You get ₹1,000
          </div>
          <div className="bg-white/20 text-white font-black text-sm px-4 py-1.5 rounded-xl">
            Friend gets ₹100
          </div>
        </div>
        <p className="text-purple-300 text-[11px] mt-2">when your friend deposits ₹250+</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* How it works */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { step: '1', text: 'Share your link' },
            { step: '2', text: 'Friend deposits ₹250+' },
            { step: '3', text: 'Both of you earn!' },
          ].map(s => (
            <div key={s.step} className="bg-zinc-800/60 rounded-xl p-2">
              <div className="w-6 h-6 rounded-full bg-purple-500/30 text-purple-400 text-[11px] font-black flex items-center justify-center mx-auto mb-1">{s.step}</div>
              <p className="text-zinc-400 text-[10px] leading-tight">{s.text}</p>
            </div>
          ))}
        </div>

        {/* Copy Link Box */}
        <CopyBox
          label="Copy Referral Link"
          value={referralLink}
          icon={<Link2 className="w-3 h-3" />}
          successMsg="Copied!"
        />

        {/* Copy Code Box */}
        <CopyBox
          label="Copy Referral Code"
          value={referralCode}
          icon={<Hash className="w-3 h-3" />}
          successMsg="Copied!"
        />

        {/* Benefits summary strip */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl px-4 py-3">
          <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest mb-2">Included in your share message</p>
          <div className="space-y-1">
            {[
              '✅ 200% Welcome Bonus on first deposit',
              '✅ Extra ₹100 for joining via referral',
              '✅ ₹1,000 for you per successful referral',
              '✅ Live IPL betting · Real-time odds',
            ].map(b => (
              <p key={b} className="text-zinc-300 text-[11px]">{b}</p>
            ))}
          </div>
        </div>

        {/* Social share */}
        <div>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2 text-center">Share via</p>
          <div className="grid grid-cols-5 gap-2">
            {platforms.map(platform => (
              <button
                key={platform.name}
                onClick={() => onShare(platform)}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-2xl text-white transition-all active:scale-90 ${platform.bg}`}
                title={platform.name + (platform.onInstagram ? ' (copies text & opens app)' : '')}
              >
                {platform.icon}
                <span className="text-[8px] font-bold">{platform.name}</span>
              </button>
            ))}
          </div>
          {/* Instagram note */}
          <p className="text-center text-[9px] text-zinc-600 mt-1.5">
            Instagram: copies message & opens app
          </p>
        </div>

        <p className="text-center text-[9px] text-zinc-600 uppercase tracking-wider pb-2">
          {SITE_URL} • T&C Apply • 18+ Only
        </p>
      </div>
    </>
  );
}
