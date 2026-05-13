import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, BookOpen, Zap, Award, Target, Loader2, MessageSquare } from 'lucide-react';
import { getHeatmap, getAnalyticsStats, type HeatmapCell, type AnalyticsStats } from '../services/api';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const intensityMap = [
  'bg-gray-100 dark:bg-gpai-surface-2',
  'bg-indigo-200 dark:bg-indigo-500/30',
  'bg-indigo-400 dark:bg-indigo-400/60',
  'bg-indigo-600 dark:bg-indigo-300',
];

const subjectColors = [
  'bg-blue-400', 'bg-indigo-400', 'bg-amber-400', 'bg-rose-400',
  'bg-emerald-400', 'bg-teal-400', 'bg-orange-400', 'bg-pink-400',
];

export default function Analytics({ onOpenChat }: { onOpenChat?: (chatId: string) => void }) {
  const [heatmap, setHeatmap] = useState<HeatmapCell[][]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getHeatmap(), getAnalyticsStats()])
      .then(([h, s]) => { setHeatmap(h); setStats(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300 dark:text-gpai-muted" />
      </div>
    );
  }

  const maxWeekly = Math.max(...(stats?.weeklyData.map(d => d.count) || [1]), 1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Study Analytics</h2>
        <p className="text-sm text-gray-500 dark:text-gpai-muted mt-0.5">Track your learning progress and performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: 'Total Questions', value: String(stats?.totalQuestions ?? 0), sub: `${stats?.weeklyQuestions ?? 0} this week`, bg: 'bg-indigo-50 border-indigo-100 dark:bg-indigo-500/10 dark:border-indigo-500/30', iconColor: 'text-indigo-600 dark:text-indigo-300' },
          { icon: Clock, label: 'Active Chats', value: String(stats?.totalChats ?? 0), sub: 'Conversations', bg: 'bg-blue-50 border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/30', iconColor: 'text-blue-600 dark:text-blue-300' },
          { icon: Zap, label: 'Subjects', value: String(stats?.totalSubjects ?? 0), sub: 'Topics explored', bg: 'bg-amber-50 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/30', iconColor: 'text-amber-600 dark:text-amber-300' },
          { icon: Award, label: 'This Week', value: String(stats?.weeklyQuestions ?? 0), sub: 'Questions asked', bg: 'bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/30', iconColor: 'text-rose-600 dark:text-rose-300' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`${stat.bg} border rounded-3xl p-4`}
            >
              <div className="w-9 h-9 rounded-xl bg-white dark:bg-gpai-surface flex items-center justify-center mb-3 shadow-sm">
                <Icon size={18} className={stat.iconColor} />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-gray-400 dark:text-gpai-muted mt-1">{stat.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Learning Heatmap</h3>
            <p className="text-xs text-gray-400 dark:text-gpai-muted mt-0.5">Daily activity over the past 7 weeks</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gpai-muted">
            <span>Less</span>
            {intensityMap.map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="flex gap-1">
              <div className="flex flex-col justify-around w-6">
                {days.map(d => (
                  <div key={d} className="text-[10px] text-gray-400 dark:text-gpai-muted text-right pr-1 h-4 flex items-center justify-end">{d}</div>
                ))}
              </div>
              <div className="flex gap-1 flex-1">
                {heatmap.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1 flex-1">
                    {week.map((cell, di) => (
                      <div
                        key={di}
                        title={`${cell.date}: ${cell.count} questions`}
                        className={`${intensityMap[cell.intensity]} rounded-sm aspect-square cursor-pointer hover:opacity-80 transition-opacity`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weekly Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Weekly Questions</h3>
            <p className="text-xs text-gray-400 dark:text-gpai-muted mt-0.5">Questions asked per day this week</p>
          </div>
          <TrendingUp size={16} className="text-gpai-primary" />
        </div>

        <div className="flex items-end justify-between gap-2 h-40">
          {(stats?.weeklyData || []).map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-400 dark:text-gpai-muted font-medium">{d.count}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${maxWeekly > 0 ? (d.count / maxWeekly) * 100 : 0}%` }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                className="w-full rounded-t-xl bg-gradient-to-t from-gpai-primary to-indigo-300 dark:to-indigo-200 hover:opacity-90 cursor-pointer transition-opacity"
                style={{ minHeight: d.count > 0 ? '4px' : '0' }}
              />
              <span className="text-[10px] text-gray-500 dark:text-gpai-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Subject Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Subject Breakdown</h3>
          <Target size={15} className="text-gray-400 dark:text-gpai-muted" />
        </div>
        {(stats?.subjectBreakdown || []).length === 0 ? (
          <p className="text-xs text-gray-400 dark:text-gpai-muted">No data yet. Ask some questions first!</p>
        ) : (
          <div className="space-y-3">
            {(stats?.subjectBreakdown || []).map((s, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-200 capitalize">{s.subject}</span>
                  <span className="text-gray-400 dark:text-gpai-muted">{s.percent}%</span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-gpai-surface-2 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.percent}%` }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                    className={`h-full ${subjectColors[i % subjectColors.length]} rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      {/* Recent questions — jump back to chat */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Recent questions</h3>
            <p className="text-xs text-gray-400 dark:text-gpai-muted mt-0.5">Open the chat where you asked each question</p>
          </div>
          <MessageSquare size={15} className="text-gray-400 dark:text-gpai-muted" />
        </div>
        {!(stats?.recentActivity?.length) ? (
          <p className="text-xs text-gray-400 dark:text-gpai-muted">No history yet.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gpai-border rounded-xl border border-gray-100 dark:border-gpai-border overflow-hidden">
            {stats!.recentActivity!.map((row, i) => (
              <button
                key={`${row.chatId || row.rawQuestion}-${i}`}
                type="button"
                disabled={!row.chatId}
                onClick={() => row.chatId && onOpenChat?.(row.chatId)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-colors ${
                  row.chatId
                    ? 'hover:bg-gray-50 dark:hover:bg-gpai-surface-2 cursor-pointer'
                    : 'opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gpai-primary-soft flex items-center justify-center shrink-0">
                  <BookOpen size={14} className="text-gpai-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100 line-clamp-2">{row.rawQuestion}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gpai-muted mt-0.5 capitalize">
                    {row.subjectTag.replace(/_/g, ' ')}
                    {row.chatId ? ' · Tap to open chat' : ' · Chat unavailable'}
                  </p>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0 pt-0.5">
                  {new Date(row.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
