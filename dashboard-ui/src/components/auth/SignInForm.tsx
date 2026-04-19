import { useState } from 'react';
import { Eye, EyeOff, BookOpen, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SignInFormProps {
  onFocus: () => void;
  onBlur: () => void;
  onGoToSignup: () => void;
}

export default function SignInForm({ onFocus, onBlur, onGoToSignup }: SignInFormProps) {
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    'w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-200 focus:border-emerald-300 transition-all duration-200';

  const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5';

  const handleEmailSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }

    setLoading(true);
    const { error: signError } = await signIn(email.trim(), password);
    setLoading(false);

    if (signError) {
      setError(signError);
      return;
    }

    window.history.replaceState({}, '', '/');
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
            <span className="text-xs text-gray-400">New here? </span>
            <button
              type="button"
              onClick={onGoToSignup}
              className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
            >
              Create account
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        <div className="mb-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-gray-100" />
            <span className="text-xs font-bold text-gray-700 tracking-wide uppercase">Sign in</span>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className={labelClass}>
              <span className="flex items-center gap-1.5">
                <Mail size={10} className="text-gray-400" />
                Email
              </span>
            </label>
            <input
              type="email"
              className={inputClass}
              placeholder="you@school.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={onFocus}
              onBlur={onBlur}
              autoComplete="email"
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
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && void handleEmailSignIn()}
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

          <div className="flex justify-end pt-0.5">
            <button type="button" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
              Forgot password?
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleEmailSignIn()}
          onFocus={onFocus}
          onBlur={onBlur}
          className="w-full mt-5 py-3 rounded-full text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
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
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-4 text-center">
          <span className="text-xs text-gray-400">Need an account? </span>
          <button
            type="button"
            onClick={onGoToSignup}
            className="text-xs text-gray-500 font-semibold hover:text-emerald-600 transition-colors"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
