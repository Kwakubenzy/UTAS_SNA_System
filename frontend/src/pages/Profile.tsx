import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Pencil, KeyRound, LogOut, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input, Select, FieldWrapper } from '../components/ui/FormField';

export const Profile: React.FC = () => {
  const { user, updateProfile, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwords, setPasswords] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    college: user?.college || '',
    department: user?.department || '',
    year: user?.year || undefined,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        college: user.college || '',
        department: user.department || '',
        year: user.year,
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'year' ? (value ? parseInt(value) : undefined) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(formData);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.new_password !== passwords.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setChangingPassword(true);
    try {
      const response = await api.changePassword(passwords.old_password, passwords.new_password);
      if (response.success) {
        toast.success('Password changed successfully');
        setShowPasswordModal(false);
        setPasswords({ old_password: '', new_password: '', confirm_password: '' });
      } else {
        toast.error(response.message || 'Failed to change password');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 text-xl font-bold text-navy-900 dark:text-white">My Profile</h1>

      <div className="mx-auto max-w-lg">
        <Card className="p-8">
          <div className="mb-6 flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1E3A8A] text-3xl font-bold text-white">
              {user?.full_name.charAt(0).toUpperCase()}
            </div>
          </div>

          {!isEditing ? (
            <>
              <h2 className="text-center text-lg font-semibold text-navy-900 dark:text-white">{user?.full_name}</h2>
              <p className="mb-6 text-center text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-navy-400">{user?.role}</p>

              <dl className="mb-6 divide-y divide-slate-100 border-y border-slate-100 dark:divide-navy-700 dark:border-navy-700">
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-slate-500 dark:text-navy-400">Username</dt>
                  <dd className="font-medium text-navy-900 dark:text-white">{user?.username}</dd>
                </div>
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-slate-500 dark:text-navy-400">Email</dt>
                  <dd className="font-medium text-navy-900 dark:text-white">{user?.email}</dd>
                </div>
                {user?.college && (
                  <div className="flex justify-between py-3 text-sm">
                    <dt className="text-slate-500 dark:text-navy-400">College</dt>
                    <dd className="font-medium text-navy-900 dark:text-white">{user.college}</dd>
                  </div>
                )}
                {user?.department && (
                  <div className="flex justify-between py-3 text-sm">
                    <dt className="text-slate-500 dark:text-navy-400">Department</dt>
                    <dd className="font-medium text-navy-900 dark:text-white">{user.department}</dd>
                  </div>
                )}
                {user?.year && (
                  <div className="flex justify-between py-3 text-sm">
                    <dt className="text-slate-500 dark:text-navy-400">Year of study</dt>
                    <dd className="font-medium text-navy-900 dark:text-white">Year {user.year}</dd>
                  </div>
                )}
                <div className="flex justify-between py-3 text-sm">
                  <dt className="text-slate-500 dark:text-navy-400">Member since</dt>
                  <dd className="font-medium text-navy-900 dark:text-white">{new Date(user?.created_at || '').toLocaleDateString()}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2.5">
                <Button icon={<Pencil className="h-4 w-4" />} onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
                <Button variant="secondary" icon={<KeyRound className="h-4 w-4" />} onClick={() => setShowPasswordModal(true)}>
                  Change Password
                </Button>
                <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={logout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldWrapper label="Full name" htmlFor="full_name">
                <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} disabled={loading} />
              </FieldWrapper>
              <FieldWrapper label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} disabled={loading} />
              </FieldWrapper>
              <FieldWrapper label="College" htmlFor="college">
                <Input id="college" name="college" value={formData.college} onChange={handleChange} placeholder="e.g., College of Engineering" disabled={loading} />
              </FieldWrapper>
              <FieldWrapper label="Department" htmlFor="department">
                <Input id="department" name="department" value={formData.department} onChange={handleChange} placeholder="e.g., Computer Science" disabled={loading} />
              </FieldWrapper>
              <FieldWrapper label="Year of study" htmlFor="year">
                <Select id="year" name="year" value={formData.year || ''} onChange={handleChange} disabled={loading}>
                  <option value="">Select year</option>
                  <option value="1">Year 1</option>
                  <option value="2">Year 2</option>
                  <option value="3">Year 3</option>
                  <option value="4">Year 4</option>
                </Select>
              </FieldWrapper>

              <div className="mt-2 flex gap-3">
                <Button type="submit" loading={loading} icon={<Save className="h-4 w-4" />} className="flex-1">
                  Save Changes
                </Button>
                <Button type="button" variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setIsEditing(false)} disabled={loading}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>

      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password">
        <form onSubmit={handleChangePassword}>
          <FieldWrapper label="Current password" htmlFor="old_password" required>
            <Input
              id="old_password"
              type="password"
              value={passwords.old_password}
              onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
              disabled={changingPassword}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="New password" htmlFor="new_password" required>
            <Input
              id="new_password"
              type="password"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              disabled={changingPassword}
              required
            />
          </FieldWrapper>
          <FieldWrapper label="Confirm password" htmlFor="confirm_password" required>
            <Input
              id="confirm_password"
              type="password"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              disabled={changingPassword}
              required
            />
          </FieldWrapper>
          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={changingPassword} className="flex-1">
              Change Password
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowPasswordModal(false)} disabled={changingPassword}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
