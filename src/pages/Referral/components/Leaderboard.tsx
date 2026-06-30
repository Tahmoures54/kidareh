import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, ChevronUp, User } from "lucide-react";
import { api } from "../../../utils/api";
import { formatPrice } from "../../../utils/formatPrice";

interface LeaderboardUser {
  rank: number;
  id: number;
  name: string;
  totalEarned: number;
  referredCount: number;
  isCurrentUser: boolean;
}

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.get<{ success: boolean; leaderboard: LeaderboardUser[]; myRank: any }>(
          "/api/referral/leaderboard?limit=50"
        );
        if (res?.success) {
          setLeaders(res.leaderboard);
          setMyRank(res.myRank);
        }
      } catch (err) {
        console.error("Leaderboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500 drop-shadow-[0_2px_4px_rgba(234,179,8,0.5)]" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-700" />;
    return <span className="text-sm font-black text-gray-400 w-6 text-center">{rank}</span>;
  };

  const getRankBg = (user: LeaderboardUser) => {
    if (user.isCurrentUser) return "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30";
    if (user.rank === 1) return "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-500/10 dark:to-amber-500/10 border-yellow-200 dark:border-yellow-500/20";
    if (user.rank === 2) return "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
    if (user.rank === 3) return "bg-orange-50/50 dark:bg-orange-500/5 border-orange-200 dark:border-orange-500/10";
    return "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/60";
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <Trophy className="w-5 h-5 text-yellow-600" />
        <h3 className="text-base font-black text-gray-900 dark:text-white">جدول رتبه‌بندی ثروت‌آفرینان</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Top 3 Podium Style */}
          {leaders.length > 0 && (
            <div className="flex items-end justify-center gap-3 mb-6 h-40">
              {/* 2nd Place */}
              {leaders[1] && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                  className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-300 mb-1">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                  <p className="text-[11px] font-black text-gray-700 dark:text-gray-300 truncate w-full text-center">{leaders[1].name}</p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-xl mt-1 h-24 flex flex-col items-center justify-center border-x border-t border-gray-300 dark:border-gray-600">
                    <Medal className="w-5 h-5 text-gray-400 mb-1" />
                    <p className="text-xs font-black text-gray-600 dark:text-gray-300">{formatPrice(leaders[1].totalEarned)}</p>
                  </div>
                </motion.div>
              )}
              
              {/* 1st Place */}
              {leaders[0] && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                  className="flex-[1.2] flex flex-col items-center">
                  <div className="relative">
                    <Crown className="w-6 h-6 text-yellow-500 absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow-lg" />
                    <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-500/20 rounded-full flex items-center justify-center border-2 border-yellow-400 mb-1 shadow-lg shadow-yellow-500/20">
                      <User className="w-7 h-7 text-yellow-600" />
                    </div>
                  </div>
                  <p className="text-[11px] font-black text-gray-900 dark:text-white truncate w-full text-center">{leaders[0].name}</p>
                  <div className="w-full bg-gradient-to-b from-yellow-100 to-amber-100 dark:from-yellow-500/20 dark:to-amber-500/10 rounded-t-xl mt-1 h-32 flex flex-col items-center justify-center border-x border-t border-yellow-300 dark:border-yellow-500/30">
                    <span className="text-[10px] font-bold text-yellow-800 dark:text-yellow-400 mb-1">سلطان معرفی</span>
                    <p className="text-sm font-black text-yellow-700 dark:text-yellow-300">{formatPrice(leaders[0].totalEarned)}</p>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {leaders[2] && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                  className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-500/10 rounded-full flex items-center justify-center border-2 border-orange-300 dark:border-orange-500/30 mb-1">
                    <User className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-[11px] font-black text-gray-700 dark:text-gray-300 truncate w-full text-center">{leaders[2].name}</p>
                  <div className="w-full bg-orange-50 dark:bg-orange-500/5 rounded-t-xl mt-1 h-20 flex flex-col items-center justify-center border-x border-t border-orange-200 dark:border-orange-500/10">
                    <Medal className="w-5 h-5 text-amber-700 mb-1" />
                    <p className="text-xs font-black text-orange-800 dark:text-orange-400">{formatPrice(leaders[2].totalEarned)}</p>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* List of other users */}
          <div className="space-y-2">
            {leaders.slice(3).map((user) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center justify-between p-3.5 rounded-2xl border ${getRankBg(user)} transition-all`}
              >
                <div className="flex items-center gap-3">
                  {getRankIcon(user.rank)}
                  <div>
                    <p className={`text-sm font-bold ${user.isCurrentUser ? "text-indigo-700 dark:text-indigo-400" : "text-gray-800 dark:text-gray-200"}`}>
                      {user.name} {user.isCurrentUser && "(شما)"}
                    </p>
                    <p className="text-[10px] text-gray-500 font-medium">{user.referredCount} دعوت موفق</p>
                  </div>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-black ${user.rank === 1 ? "text-yellow-600" : "text-gray-900 dark:text-white"}`}>
                    {formatPrice(user.totalEarned)} <span className="text-[10px] font-bold text-gray-400">تومان</span>
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* My Rank Footer */}
          {myRank && !leaders.find(u => u.isCurrentUser) && (
            <div className="mt-4 sticky bottom-4 bg-indigo-600 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-between border border-indigo-500">
              <div className="flex items-center gap-3">
                <ChevronUp className="w-5 h-5 text-indigo-200" />
                <div>
                  <p className="text-sm font-black">رتبه شما</p>
                  <p className="text-[10px] text-indigo-200 font-medium">به رتبه بالاتر دلخور نشو، بیشتر معرفی کن!</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-indigo-200">رتبه {myRank.rank}</p>
                <p className="text-sm font-black">{formatPrice(myRank.totalEarned)} تومان</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}