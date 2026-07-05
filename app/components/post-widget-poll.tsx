'use client';

import { useState, useCallback } from 'react';
import { AncialAPI } from '../lib/api-v2';
import { useAuth } from '../context/AuthContext';

export type PollWidgetData = {
  type: 'poll';
  question: string;
  options: string[];
  votes: number[];
  total_votes: number;
  user_vote_option: number | null;
};

type PostWidgetPollProps = PollWidgetData & {
  postId: number | string;
};

export default function PostWidgetPoll({
  postId,
  question,
  options,
  votes: initialVotes,
  total_votes: initialTotal,
  user_vote_option: initialVote,
}: PostWidgetPollProps) {
  const { isAuthenticated } = useAuth();
  const [votes, setVotes] = useState<number[]>(initialVotes);
  const [total, setTotal] = useState(initialTotal);
  const [userVote, setUserVote] = useState<number | null>(initialVote);
  const [loading, setLoading] = useState(false);

  const handleVote = useCallback(async (index: number) => {
    if (!isAuthenticated || loading) return;

    // Оптимистичное обновление
    const prevVotes = [...votes];
    const prevTotal = total;
    const prevUserVote = userVote;

    const newVotes = [...votes];
    if (userVote === index) {
      // Отзыв голоса
      newVotes[index] = Math.max(0, newVotes[index] - 1);
      setVotes(newVotes);
      setTotal(Math.max(0, total - 1));
      setUserVote(null);
    } else {
      if (userVote !== null) {
        // Смена варианта
        newVotes[userVote] = Math.max(0, newVotes[userVote] - 1);
      }
      newVotes[index] = newVotes[index] + 1;
      setVotes(newVotes);
      setTotal(userVote !== null ? total : total + 1);
      setUserVote(index);
    }

    setLoading(true);
    try {
      const res = await AncialAPI.pollVote(Number(postId), index);
      setVotes(res.votes);
      setTotal(res.total_votes);
      setUserVote(res.user_vote_option);
    } catch (e) {
      // Откат при ошибке
      setVotes(prevVotes);
      setTotal(prevTotal);
      setUserVote(prevUserVote);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loading, votes, total, userVote, postId]);

  return (
    <div className="w-full border border-zinc-700/60 rounded-3xl overflow-hidden bg-zinc-800/40">
      <div className="p-3">
        <p className="text-zinc-100 font-semibold text-base leading-snug mb-3">{question}</p>
        <div className="flex flex-col gap-1.5">
          {options.map((option, index) => {
            const pct = total > 0 ? Math.round((votes[index] ?? 0) / total * 100) : 0;
            const isChosen = userVote === index;
            return (
              <button
                key={index}
                type="button"
                onClick={() => void handleVote(index)}
                disabled={!isAuthenticated || loading}
                className={`relative w-full text-left rounded-3xl overflow-hidden border transition-all duration-300 active:scale-[0.98] ${isChosen
                  ? 'border-purple-500/80 bg-purple-900/20'
                  : 'border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600'
                  } ${(!isAuthenticated || loading) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                aria-pressed={isChosen}
              >
                {/* Progress bar */}
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-xl ${isChosen ? 'bg-purple-500/25' : 'bg-zinc-600/30'
                    }`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2.5 gap-2">
                  <span className={`text-sm font-medium ${isChosen ? 'text-purple-200' : 'text-zinc-200'}`}>
                    {option}
                  </span>
                  <span className={`text-sm font-bold shrink-0 ${isChosen ? 'text-purple-300' : 'text-zinc-400'}`}>
                    {pct}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-4 pb-3 flex items-center gap-2">
        <span className="text-zinc-500 text-xs">
          {total} {total === 1 ? 'голос' : total >= 2 && total <= 4 ? 'голоса' : 'голосов'}
        </span>
        {loading && (
          <svg className="w-3 h-3 animate-spin fill-purple-400" viewBox="0 0 48 48">
            <use href="#IC-loader"></use>
          </svg>
        )}
      </div>
    </div>
  );
}
