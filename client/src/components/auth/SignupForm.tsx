import { useState } from 'react';
import { Eye, EyeOff, BookOpen, GraduationCap, User, Mail, Lock, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type InstitutionType = 'school' | 'college';

interface FormData {
  username: string;
  email: string;
  password: string;
  institutionType: InstitutionType;
  institutionName: string;
  gradeYear: string;
  agreed: boolean;
}

interface SignupFormProps {
  onFocus: () => void;
  onBlur: () => void;
  onGoToSignIn?: () => void;
}

const SCHOOL_GRADES = ['9th Grade', '10th Grade', '11th Grade', '12th Grade'];
const COLLEGE_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

export default function SignupForm({ onFocus, onBlur, onGoToSignIn }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    institutionType: 'school',
    institutionName: '',
    gradeYear: '',
    agreed: false,
  });

  const handleFocus = () => onFocus();
  const handleBlur = () => onBlur();

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'institutionType') next.gradeYear = '';
      return next;
    });
  };

  const gradeOptions = formData.institutionType === 'school' ? SCHOOL_GRADES : COLLEGE_YEARS;

  const inputClass =
    'w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 focus:border-emerald-300 transition-all duration-200';

  const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5';
  const { signUp } = useAuth();

  const handleSignUp = async () => {
    setError(null);
    setInfo(null);

    if (!formData.username.trim()) {
      setError('Please enter a username.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!formData.institutionName.trim()) {
      setError('Please enter your school or college name.');
      return;
    }
    if (!formData.gradeYear) {
      setError(`Please select your ${formData.institutionType === 'school' ? 'grade' : 'year'}.`);
      return;
    }
    if (!formData.agreed) {
      setError('Please accept the terms to continue.');
      return;
    }

    setLoading(true);
    const { error: signError } = await signUp({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      institutionType: formData.institutionType,
      institutionName: formData.institutionName.trim(),
      gradeYear: formData.gradeYear,
    });
    setLoading(false);

    if (signError) {
      setError(signError);
      return;
    }

    setInfo('Account created and signed in.');
  };

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto">
      <div className="flex-1 px-7 pt-6 pb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #10b981, #34d399)' }}
            >
              <BookOpen size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 leading-tight">VidyaBot</div>
              <div className="text-xs text-gray-500 leading-tight">Concept Learning Portal</div>
            </div>
          </div>
          <div className="text-right pt-1">
            <span className="text-xs text-gray-400">Already a member? </span>
            <button
              type="button"
              onClick={() => onGoToSignIn?.()}
              className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {info && (
          <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{info}</div>
        )}

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">Create Account</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>

        </div>

        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <User size={10} className="text-gray-400" />
                Username
              </span>
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder="robertsmith"
              value={formData.username}
              onChange={e => handleChange('username', e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Mail size={10} className="text-gray-400" />
                Email Address
              </span>
            </label>
            <input
              type="email"
              className={inputClass}
              placeholder="robertsmith@gmail.com"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Lock size={10} className="text-gray-400" />
                Password
              </span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={inputClass + ' pr-10'}
                placeholder="••••••••"
                value={formData.password}
                onChange={e => handleChange('password', e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <GraduationCap size={10} className="text-gray-400" />
                Institution
              </span>
            </label>
            <div className="flex gap-2">
              {(['school', 'college'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onClick={() => handleChange('institutionType', type)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-full border transition-all duration-200 capitalize cursor-pointer ${
                    formData.institutionType === type
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                      : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-150 hover:text-gray-700'
                  }`}
                >
                  {type === 'school' ? 'School' : 'College'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>School/College Name</label>
            <input
              type="text"
              className={inputClass}
              placeholder={formData.institutionType === 'school' ? 'e.g., Greenwood High' : 'e.g., MIT'}
              value={formData.institutionName}
              onChange={e => handleChange('institutionName', e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label className={labelClass}>
              {formData.institutionType === 'school' ? 'Grade' : 'Year'}
            </label>
            <div className="relative">
              <select
                className={inputClass + ' appearance-none cursor-pointer pr-9'}
                value={formData.gradeYear}
                onChange={e => handleChange('gradeYear', e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              >
                <option value="">Select {formData.institutionType === 'school' ? 'grade' : 'year'}...</option>
                {gradeOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <label className="flex items-start gap-2.5 cursor-pointer group">
            <div className="relative mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.agreed}
                onChange={e => handleChange('agreed', e.target.checked)}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <div className="w-4 h-4 rounded border border-gray-300 bg-white peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all duration-200 flex items-center justify-center">
                {formData.agreed && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-500 leading-relaxed">
              I agree to all{' '}
              <span className="text-emerald-600 font-semibold cursor-pointer hover:underline">Terms</span>
              {' '}and{' '}
              <span className="text-emerald-600 font-semibold cursor-pointer hover:underline">Privacy Policy</span>
            </span>
          </label>

          <button
            type="button"
            disabled={loading}
            onClick={() => void handleSignUp()}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="w-full mt-4 py-3 rounded-full text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
            style={{
              background: 'linear-gradient(90deg, #10b981, #34d399)',
            }}
            onMouseEnter={e => {
              if (loading) return;
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(90deg, #059669, #10b981)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(16,185,129,0.4)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(90deg, #10b981, #34d399)';
              (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
            }}
          >
            {loading ? 'Creating account…' : 'Sign Up'}
          </button>
        </div>

        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400">Already have an account? </span>
          <button
            type="button"
            onClick={() => onGoToSignIn?.()}
            className="text-xs text-gray-500 font-semibold hover:text-emerald-600 transition-colors"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );
}
