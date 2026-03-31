/**
 * ReferralCodeEntry.tsx — Shown to newly registered users
 * If they signed up via a referral link, lets them enter the referrer's code.
 * On submit, the referrer gets ₹1,000 once THIS user deposits ₹250+.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, CheckCircle, X, ArrowRight } from 'lucide-react';
import { collection, query, where, getDocs, doc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const MIN_DEPOSIT_FOR_REFERRAL = 250;

interface Props {
  uid: string;
  onClose: () => void;
}

export default function ReferralCodeEntry({ uid, onClose }: Props) {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 4) {
      setError('Please enter a valid referral code.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      // Find the user who owns this referral code using the referralCodes index
      const refCodeDoc = await getDoc(doc(db, 'referralCodes', trimmedCode));
      
      if (!refCodeDoc.exists()) {
        setError('Invalid referral code. Please check and try again.');
        return;
      }

      const refCodeData = refCodeDoc.data();
      const referrerUid = refCodeData?.uid;

      if (referrerUid === uid) {
        setError("You can't use your own referral code!");
        return;
      }

      // Check if the REFERRER has deposited minimum ₹250
      const referrerDepositsRef = collection(db, 'deposits');
      const referrerDepositsQuery = query(referrerDepositsRef, where('uid', '==', referrerUid));
      const referrerDepositsSnap = await getDocs(referrerDepositsQuery);
      
      let referrerTotalDeposited = 0;
      referrerDepositsSnap.forEach(doc => {
        const deposit = doc.data();
        if (deposit.status === 'approved') {
          referrerTotalDeposited += deposit.amount || 0;
        }
      });

      if (referrerTotalDeposited < MIN_DEPOSIT_FOR_REFERRAL) {
        setError(`The referrer must have deposited ₹${MIN_DEPOSIT_FOR_REFERRAL} first. Current: ₹${referrerTotalDeposited}`);
        setIsSubmitting(false);
        return;
      }

      // Check if code is already used by this user
      const existingRef = query(collection(db, 'referrals'), 
        where('refereeUid', '==', uid),
        where('referralCode', '==', trimmedCode)
      );
      const existing = await getDocs(existingRef);
      if (!existing.empty) {
        setError('You have already used this referral code.');
        return;
      }

      // Create a pending referral document — bonus fires when this user deposits ₹250+
      await addDoc(collection(db, 'referrals'), {
        referrerUid,
        refereeUid: uid,
        referralCode: trimmedCode,
        status: 'pending', // → 'rewarded' once referee deposits ₹250+
        timestamp: Date.now(),
      });

      setSuccess(true);
      setTimeout(onClose, 3000);
    } catch (e) {
      console.error('ReferralCodeEntry error:', e);
      setError(`Error: ${e instanceof Error ? e.message : 'Something went wrong. Please try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.8, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>

          {success ? (
            <div className="p-10 flex flex-col items-center text-center">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}>
                <CheckCircle className="w-16 h-16 text-emerald-400 mb-4" />
              </motion.div>
              <h3 className="text-2xl font-black text-white">Referral Linked!</h3>
              <p className="text-zinc-400 mt-2 text-sm">
                Your friend will receive <span className="text-yellow-400 font-bold">₹1,000</span> once you make your first deposit of ₹250+.<br/><br/>
                <span className="text-emerald-400 font-bold">You'll get ₹100 extra</span> credited to your wallet too!
              </p>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-indigo-700 to-purple-700 px-6 pt-7 pb-8 text-center">
                <div className="w-14 h-14 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <Gift className="w-7 h-7 text-yellow-900" />
                </div>
                <h2 className="text-2xl font-black text-white">Have a coupon code?</h2>
                <p className="text-indigo-200 text-sm mt-1">Enter it below & get <span className="text-yellow-300 font-black">₹100 bonus</span> on your first deposit!</p>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 block">
                    Referral Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
                    placeholder="e.g. AB12CD34"
                    maxLength={10}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white font-bold font-mono tracking-widest focus:border-purple-500 outline-none transition placeholder:text-zinc-600 uppercase text-center text-lg"
                  />
                  {error && (
                    <p className="text-red-400 text-xs mt-1.5 text-center">{error}</p>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || code.length < 4}
                  className={`w-full py-3.5 font-black rounded-2xl text-sm transition-all flex items-center justify-center gap-2 ${
                    isSubmitting || code.length < 4
                      ? 'bg-zinc-800 text-zinc-500'
                      : 'bg-purple-600 hover:bg-purple-500 text-white active:scale-95'
                  }`}
                >
                  {isSubmitting ? 'VERIFYING...' : (<>APPLY CODE <ArrowRight className="w-4 h-4" /></>)}
                </button>

                <button 
                  onClick={onClose} 
                  className="w-full py-3.5 font-bold rounded-2xl text-sm transition-all border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 mt-3"
                >
                  SKIP
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
