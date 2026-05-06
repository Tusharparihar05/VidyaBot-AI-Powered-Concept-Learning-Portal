import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, GraduationCap, LogOut, Save, Loader2, CheckCircle, Mail, Building, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword, type UserProfile } from '../services/api';

const SCHOOL_GRADES = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
const COLLEGE_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function Settings() {
  const { profile: authProfile, signOut, refreshProfile, session } = useAuth();
  const [dbProfile, setDbProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [institutionType, setInstitutionType] = useState('school');
  const [institutionName, setInstitutionName] = useState('');
  const [gradeYear, setGradeYear] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then(p => {
        setDbProfile(p);
        setName(p.name);
        setInstitutionType(p.institutionType);
        setInstitutionName(p.institutionName);
        setGradeYear(p.gradeYear);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const gradeOptions = institutionType === 'school' ? SCHOOL_GRADES : COLLEGE_YEARS;

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateProfile({ name, institutionType, institutionName, gradeYear });
      setDbProfile(updated);
      // Keep auth header profile in sync immediately so header/settings reflect edits without re-login.
      const raw = localStorage.getItem('vidyabot-auth');
      if (raw && session?.token) {
        try {
          const parsed = JSON.parse(raw) as { token: string; profile: { displayName: string; classLine: string; email: string; avatarUrl: string } };
          const next = {
            ...parsed,
            profile: {
              ...parsed.profile,
              displayName: updated.name,
              classLine: [updated.gradeYear, updated.institutionName].filter(Boolean).join(' · ') || '—',
            },
          };
          localStorage.setItem('vidyabot-auth', JSON.stringify(next));
          refreshProfile();
        } catch {}
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const handleChangePassword = async () => {
    setPwSaving(true);
    setPwMsg('');
    try {
      await changePassword(currentPassword, newPassword);
      setPwMsg('Password updated!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: unknown) {
      let msg = 'Failed to update password';
      if (err && typeof err === 'object' && 'response' in err) {
        const axErr = err as { response?: { data?: { message?: string } } };
        msg = axErr.response?.data?.message || msg;
      }
      setPwMsg(msg);
    }
    setPwSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-300 dark:text-gpai-muted" />
      </div>
    );
  }

  const inputClass = 'w-full bg-gray-50 dark:bg-gpai-surface-2 border border-gray-200 dark:border-gpai-border rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-1 focus:ring-gpai-primary/40 focus:border-gpai-primary transition-all';
  const labelClass = 'block text-xs font-medium text-gray-500 dark:text-gpai-muted mb-1.5';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h2>
        <p className="text-sm text-gray-500 dark:text-gpai-muted mt-0.5">Manage your VidyaBot preferences</p>
      </div>

      {/* Profile Banner */}
      <div className="bg-gradient-to-r from-gpai-primary to-indigo-500 dark:from-gpai-primary dark:to-violet-500 rounded-3xl p-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30 shrink-0">
          <img
            src={authProfile?.avatarUrl}
            alt={authProfile?.displayName ?? 'Profile'}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base">{dbProfile?.name || authProfile?.displayName || 'Student'}</h3>
          <p className="text-white/80 text-sm truncate">{dbProfile?.email || authProfile?.email}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <GraduationCap size={12} className="text-white/80 shrink-0" />
            <span className="text-white/80 text-xs">{dbProfile?.gradeYear} · {dbProfile?.institutionName}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white/95 text-gpai-primary text-xs font-semibold rounded-xl hover:bg-white transition-colors shrink-0"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>

      {/* Edit Profile */}
      <div className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <User size={15} className="text-gpai-primary" /> Profile Settings
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Display Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email (read-only)</label>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gray-400" />
              <span className="text-sm text-gray-500">{dbProfile?.email}</span>
            </div>
          </div>
          <div>
            <label className={labelClass}>Institution Type</label>
            <select
              value={institutionType}
              onChange={e => { setInstitutionType(e.target.value); setGradeYear(''); }}
              className={inputClass}
            >
              <option value="school">School</option>
              <option value="college">College</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1"><Building size={12} /> Institution Name</span>
            </label>
            <input type="text" value={institutionName} onChange={e => setInstitutionName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1"><BookOpen size={12} /> Grade / Year</span>
            </label>
            <select value={gradeYear} onChange={e => setGradeYear(e.target.value)} className={inputClass}>
              <option value="">Select...</option>
              {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gpai-primary hover:bg-gpai-primary-hover disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Change Password */}
      <div className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Change Password</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} />
          </div>
        </div>
        {pwMsg && <p className={`text-xs ${pwMsg.includes('updated') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{pwMsg}</p>}
        <button
          onClick={handleChangePassword}
          disabled={pwSaving || !currentPassword || !newPassword}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 dark:bg-gpai-surface-2 dark:hover:bg-gpai-border disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Update Password
        </button>
      </div>

      {/* Account Info */}
      <div className="bg-white dark:bg-gpai-surface rounded-3xl border border-gray-100 dark:border-gpai-border shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">Account</h3>
        <p className="text-xs text-gray-500 dark:text-gpai-muted">
          Member since {dbProfile?.createdAt ? new Date(dbProfile.createdAt).toLocaleDateString() : '—'}
        </p>
      </div>
    </motion.div>
  );
}
