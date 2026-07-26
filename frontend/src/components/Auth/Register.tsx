import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Input, Select, FieldWrapper } from '../ui/FormField';

export const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    college: '',
    department: '',
    year: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await register({ ...formData, year: formData.year ? parseInt(formData.year) : undefined });
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-navy-950">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-navy-700 dark:bg-navy-800"
      >
        <div className="px-8 pb-8 pt-10">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1E3A8A]">
              <UserPlus className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-navy-900 dark:text-white">Create Account</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-navy-300">Join UTAS SNA System</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FieldWrapper label="Username" htmlFor="username" required>
                <Input id="username" name="username" value={formData.username} onChange={handleChange} placeholder="Choose username" required disabled={loading} />
              </FieldWrapper>
              <FieldWrapper label="Email" htmlFor="email" required>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Enter email" required disabled={loading} />
              </FieldWrapper>
            </div>

            <FieldWrapper label="Full name" htmlFor="full_name" required>
              <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Enter full name" required disabled={loading} />
            </FieldWrapper>

            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FieldWrapper label="Password" htmlFor="password" required>
                <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Min 6 characters" required disabled={loading} />
              </FieldWrapper>
              <FieldWrapper label="Year of study" htmlFor="year">
                <Select id="year" name="year" value={formData.year} onChange={handleChange} disabled={loading}>
                  <option value="">Select year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </Select>
              </FieldWrapper>
            </div>

            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <FieldWrapper label="College" htmlFor="college">
                <Input id="college" name="college" value={formData.college} onChange={handleChange} placeholder="e.g., College of Engineering" disabled={loading} />
              </FieldWrapper>
              <FieldWrapper label="Department" htmlFor="department">
                <Input id="department" name="department" value={formData.department} onChange={handleChange} placeholder="e.g., Computer Science" disabled={loading} />
              </FieldWrapper>
            </div>

            <Button type="submit" loading={loading} className="mt-2 w-full">
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-500 dark:border-navy-700 dark:text-navy-300">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Login here
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
