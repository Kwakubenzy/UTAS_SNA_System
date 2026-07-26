import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthInput } from './AuthInput';
import { GoogleSignInButton } from './GoogleSignInButton';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  username?: string;
  password?: string;
}

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[#1E3A8A]">
            <img src="/utas-logo.png" alt="UTAS logo" className="h-9 w-9 object-contain" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">UTAS SNA System</h1>
          <p className="mt-1.5 text-sm text-slate-500">Social Network Analysis Platform</p>
        </div>

          <form onSubmit={handleSubmit} noValidate>
            <AuthInput
              id="username"
              name="username"
              srLabel="Username or Email"
              icon={UserIcon}
              type="text"
              placeholder="Username or Email"
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
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={loading}
              autoComplete="current-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
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
                  className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => toast('Contact your system administrator to reset your password.')}
                className="text-sm font-semibold text-[#1E3A8A] hover:text-blue-800"
              >
                Forgot Password?
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={loading ? undefined : { scale: 1.02 }}
              whileTap={loading ? undefined : { scale: 0.98 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-[#17306F] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
            {loading ? 'Signing in...' : 'Login'}
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
          <Link to="/register" className="font-semibold text-[#1E3A8A] hover:text-[#17306F]">
            Register Here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
