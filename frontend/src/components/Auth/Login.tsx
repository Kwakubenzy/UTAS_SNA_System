import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, User as UserIcon, Loader2, Share2, BarChart3, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthInput } from './AuthInput';
import { GoogleSignInButton } from './GoogleSignInButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  username?: string;
  password?: string;
}

const BRAND_POINTS = [
  {
    icon: Share2,
    title: 'Map the real network',
    text: 'Every student a node, every friendship an edge — the campus as it actually connects.',
  },
  {
    icon: BarChart3,
    title: 'Measure influence',
    text: 'Centrality, community detection, and bridge-node analysis on live survey data.',
  },
  {
    icon: Target,
    title: 'Act on evidence',
    text: 'Turn analysis into named, concrete campaign outreach plans in one click.',
  },
];

/** Decorative node-and-edge motif for the brand panel -- the product is
 *  literally network graphs, so the background echoes one. Purely
 *  decorative (aria-hidden), low-contrast so text stays readable. */
const NetworkMotif: React.FC = () => (
  <svg
    aria-hidden="true"
    className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.14]"
    viewBox="0 0 400 600"
    preserveAspectRatio="xMidYMid slice"
  >
    <g stroke="#93C5FD" strokeWidth="1">
      <line x1="60" y1="80" x2="180" y2="140" />
      <line x1="180" y1="140" x2="90" y2="260" />
      <line x1="180" y1="140" x2="320" y2="90" />
      <line x1="90" y1="260" x2="230" y2="310" />
      <line x1="230" y1="310" x2="320" y2="90" />
      <line x1="230" y1="310" x2="150" y2="440" />
      <line x1="150" y1="440" x2="310" y2="480" />
      <line x1="310" y1="480" x2="360" y2="340" />
      <line x1="230" y1="310" x2="360" y2="340" />
      <line x1="60" y1="520" x2="150" y2="440" />
    </g>
    <g fill="#BFDBFE">
      <circle cx="60" cy="80" r="6" />
      <circle cx="180" cy="140" r="9" />
      <circle cx="320" cy="90" r="5" />
      <circle cx="90" cy="260" r="5" />
      <circle cx="230" cy="310" r="10" />
      <circle cx="150" cy="440" r="6" />
      <circle cx="310" cy="480" r="7" />
      <circle cx="360" cy="340" r="5" />
      <circle cx="60" cy="520" r="4" />
    </g>
  </svg>
);

export const Login: React.FC = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const username = formData.username.trim();

    if (!username) {
      nextErrors.username = 'Username or email is required';
    } else if (username.includes('@') && !EMAIL_REGEX.test(username)) {
      nextErrors.username = 'Enter a valid email address';
    }

    if (!formData.password) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await login(formData.username.trim(), formData.password, remember);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleGoogleCredential = async (credential: string) => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(credential, remember);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Brand panel -- desktop only, echoes the app's navy sidebar theme */}
      <div className="relative hidden w-[44%] flex-col justify-between overflow-hidden bg-navy-900 p-12 lg:flex">
        <NetworkMotif />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
            <img src="/utas-logo.png" alt="UTAS logo" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-white">UTAS SNA</p>
            <p className="text-xs leading-tight text-navy-400">Analytics Platform</p>
          </div>
        </div>

        <div className="relative">
          <h2 className="mb-3 text-3xl font-bold leading-snug text-white">
            Social Network Analysis for UTAS Campus
          </h2>
          <p className="mb-10 text-[15px] leading-relaxed text-navy-300">
            Evidence-based insight into how students actually connect — built for
            campaign planning that reaches beyond the obvious circles.
          </p>

          <ul className="space-y-6">
            {BRAND_POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-300">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-navy-300">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-navy-500">
          UTAS SNA System &copy; {new Date().getFullYear()} &middot; University of Technology and Applied Sciences
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Compact logo header -- mobile/tablet only, where the brand panel is hidden */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#1E3A8A]">
              <img src="/utas-logo.png" alt="UTAS logo" className="h-9 w-9 object-contain" />
            </div>
            <h1 className="text-xl font-bold text-navy-900">UTAS SNA System</h1>
            <p className="mt-1 text-sm text-slate-500">Social Network Analysis Platform</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-navy-900">Sign in</h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Welcome back — enter your details to continue.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <AuthInput
                id="username"
                name="username"
                srLabel="Username or Email"
                visibleLabel
                icon={UserIcon}
                type="text"
                placeholder="e.g. kwame01 or you@utas.edu.om"
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
                disabled={loading}
                autoComplete="username"
              />

              <AuthInput
                id="password"
                name="password"
                srLabel="Password"
                visibleLabel
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                disabled={loading}
                autoComplete="current-password"
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />

              <div className="mb-7 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => toast('Contact your system administrator to reset your password.')}
                  className="cursor-pointer text-sm font-semibold text-[#1E3A8A] transition-colors hover:text-blue-800"
                >
                  Forgot Password?
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={loading ? undefined : { scale: 1.01 }}
                whileTap={loading ? undefined : { scale: 0.99 }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#17306F] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/40 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign in'}
              </motion.button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading || googleLoading} />

            <p className="mt-7 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-[#1E3A8A] transition-colors hover:text-[#17306F]">
                Register Here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
