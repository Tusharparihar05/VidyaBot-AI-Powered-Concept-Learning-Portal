import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette, ChevronRight, GraduationCap } from 'lucide-react';

const sections = [
  {
    title: 'Profile Settings',
    icon: User,
    items: ['Display Name', 'Email Address', 'Academic Level', 'Study Goals'],
  },
  {
    title: 'Notifications',
    icon: Bell,
    items: ['Daily Reminders', 'Credit Alerts', 'New Content', 'Achievement Alerts'],
  },
  {
    title: 'Appearance',
    icon: Palette,
    items: ['Theme', 'Language', 'Font Size', 'Compact Mode'],
  },
  {
    title: 'Privacy & Security',
    icon: Shield,
    items: ['Data Privacy', 'Session History', 'Export Data', 'Delete Account'],
  },
];

export default function Settings() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Manage your VidyaBot preferences</p>
      </div>

      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30">
          <img
            src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&dpr=1"
            alt="Priya"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-base">Priya Sharma</h3>
          <p className="text-emerald-100 text-sm">priya.sharma@email.com</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <GraduationCap size={12} className="text-emerald-200" />
            <span className="text-emerald-100 text-xs">BTech CSE · Year 2 · NITK Surathkal</span>
          </div>
        </div>
        <button className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-xl transition-colors">
          Edit Profile
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section, si) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={si}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.08 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Icon size={14} className="text-emerald-600" />
                </div>
                <span className="text-sm font-bold text-gray-800">{section.title}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {section.items.map((item, ii) => (
                  <button
                    key={ii}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-sm text-gray-700">{item}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </button>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Plan & Credits</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">Student Pro Plan</p>
            <p className="text-xs text-gray-500 mt-0.5">10 credits/day · Renews daily at midnight</p>
          </div>
          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">Active</span>
        </div>
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Daily Credits Used</span>
            <span className="font-semibold text-gray-700">7 / 10</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full w-[70%] bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" />
          </div>
        </div>
        <button className="mt-4 w-full py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors">
          Upgrade to Unlimited
        </button>
      </div>
    </motion.div>
  );
}
