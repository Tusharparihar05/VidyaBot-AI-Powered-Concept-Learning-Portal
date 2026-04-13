import { motion } from 'framer-motion';
import { TrendingUp, Clock, BookOpen, Zap, Award, Target } from 'lucide-react';

const heatmapData = Array.from({ length: 7 }, (_, week) =>
  Array.from({ length: 7 }, (_, day) => ({
    week,
    day,
    intensity: Math.random() > 0.3 ? Math.floor(Math.random() * 4) : 0,
  }))
);

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const months = ['Jan', 'Feb', 'Mar', 'Apr'];

const intensityMap = [
  'bg-gray-100',
  'bg-emerald-200',
  'bg-emerald-400',
  'bg-emerald-600',
];

const weeklyData = [
  { label: 'Mon', value: 45, topics: 3 },
  { label: 'Tue', value: 90, topics: 5 },
  { label: 'Wed', value: 30, topics: 2 },
  { label: 'Thu', value: 120, topics: 7 },
  { label: 'Fri', value: 60, topics: 4 },
  { label: 'Sat', value: 15, topics: 1 },
  { label: 'Sun', value: 75, topics: 5 },
];
const maxValue = Math.max(...weeklyData.map(d => d.value));

export default function Analytics() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">Study Analytics</h2>
        <p className="text-sm text-gray-500 mt-0.5">Track your learning progress and performance</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: 'Time Saved', value: '23.5 hrs', sub: '+4.2 hrs this week', color: 'emerald', bg: 'bg-emerald-50 border-emerald-100', iconColor: 'text-emerald-600' },
          { icon: BookOpen, label: 'Topics Covered', value: '47', sub: '+6 this week', color: 'blue', bg: 'bg-blue-50 border-blue-100', iconColor: 'text-blue-600' },
          { icon: Zap, label: 'Credits Used', value: '38 / 70', sub: '54% efficiency', color: 'amber', bg: 'bg-amber-50 border-amber-100', iconColor: 'text-amber-600' },
          { icon: Award, label: 'Streak', value: '12 days', sub: 'Personal best!', color: 'rose', bg: 'bg-rose-50 border-rose-100', iconColor: 'text-rose-600' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
              className={`${stat.bg} border rounded-3xl p-4`}
            >
              <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center mb-3 shadow-sm`}>
                <Icon size={18} className={stat.iconColor} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs font-medium text-gray-600 mt-0.5">{stat.label}</p>
              <p className="text-[10px] text-gray-400 mt-1">{stat.sub}</p>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Learning Heatmap</h3>
            <p className="text-xs text-gray-400 mt-0.5">Daily activity over the past 4 weeks</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <span>Less</span>
            {intensityMap.map((cls, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <div className="flex gap-1 mb-1 pl-8">
              {months.map((m, i) => (
                <div key={i} className="flex-1 text-[10px] text-gray-400">{m}</div>
              ))}
            </div>
            <div className="flex gap-1">
              <div className="flex flex-col justify-around">
                {days.map(d => (
                  <div key={d} className="text-[10px] text-gray-400 w-6 text-right pr-1">{d}</div>
                ))}
              </div>
              <div className="flex gap-1 flex-1">
                {heatmapData.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1 flex-1">
                    {week.map((cell, di) => (
                      <div
                        key={di}
                        title={`${cell.intensity * 30} min`}
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold text-gray-800">Weekly Study Time</h3>
            <p className="text-xs text-gray-400 mt-0.5">Minutes spent learning per day</p>
          </div>
          <TrendingUp size={16} className="text-emerald-500" />
        </div>

        <div className="flex items-end justify-between gap-2 h-40">
          {weeklyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-gray-400 font-medium">{d.value}m</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.value / maxValue) * 100}%` }}
                transition={{ delay: 0.5 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                className="w-full rounded-t-xl bg-gradient-to-t from-emerald-500 to-emerald-300 hover:from-emerald-600 hover:to-emerald-400 cursor-pointer transition-colors"
              />
              <span className="text-[10px] text-gray-500">{d.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-800">Subject Breakdown</h3>
          <Target size={15} className="text-gray-400" />
        </div>
        <div className="space-y-3">
          {[
            { subject: 'Computer Science', percent: 38, color: 'bg-blue-400' },
            { subject: 'Physics', percent: 28, color: 'bg-emerald-400' },
            { subject: 'Mathematics', percent: 20, color: 'bg-amber-400' },
            { subject: 'Chemistry', percent: 14, color: 'bg-rose-400' },
          ].map((s, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">{s.subject}</span>
                <span className="text-gray-400">{s.percent}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.percent}%` }}
                  transition={{ delay: 0.6 + i * 0.1, duration: 0.6, ease: 'easeOut' }}
                  className={`h-full ${s.color} rounded-full`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
