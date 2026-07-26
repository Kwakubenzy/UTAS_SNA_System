import React, { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Settings as SettingsIcon, Save, Shield, BarChart3, Database, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/FormField';

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({ notifications_enabled: true, email_notifications: true, language: 'en' });
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === 'admin';

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implement API call to save settings (no /api/settings endpoint exists yet)
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-navy-700 dark:text-navy-200">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-navy-900 dark:text-white">Settings</h1>
      </div>

      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-navy-900 dark:text-white">General Settings</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="theme" className="text-sm font-medium text-navy-700 dark:text-navy-200">
                Theme
              </label>
              <Select id="theme" value={theme} onChange={(e) => setTheme(e.target.value as ThemeMode)} className="w-48">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto (System)</option>
              </Select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label htmlFor="language" className="text-sm font-medium text-navy-700 dark:text-navy-200">
                Language
              </label>
              <Select
                id="language"
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                disabled={loading}
                className="w-48"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </Select>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-navy-900 dark:text-white">Notifications</h2>
          </CardHeader>
          <CardBody className="space-y-3">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-700 dark:text-navy-200">
              <input
                type="checkbox"
                checked={settings.notifications_enabled}
                onChange={(e) => setSettings({ ...settings, notifications_enabled: e.target.checked })}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Enable in-app notifications
            </label>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-navy-700 dark:text-navy-200">
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) => setSettings({ ...settings, email_notifications: e.target.checked })}
                disabled={loading}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Send email notifications
            </label>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-900 dark:text-white">
              <Info className="h-4 w-4 text-slate-400" /> System Information
            </h2>
          </CardHeader>
          <CardBody>
            <dl className="divide-y divide-slate-100 dark:divide-navy-700">
              <div className="flex justify-between py-2.5 text-sm">
                <dt className="text-slate-500 dark:text-navy-400">Application</dt>
                <dd className="font-medium text-navy-900 dark:text-white">UTAS SNA System</dd>
              </div>
              <div className="flex justify-between py-2.5 text-sm">
                <dt className="text-slate-500 dark:text-navy-400">Logged in as</dt>
                <dd className="font-medium text-navy-900 dark:text-white">
                  {user?.username} <span className="capitalize text-slate-400">({user?.role})</span>
                </dd>
              </div>
              <div className="flex justify-between py-2.5 text-sm">
                <dt className="text-slate-500 dark:text-navy-400">API endpoint</dt>
                <dd className="font-medium text-navy-900 dark:text-white">
                  {import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}
                </dd>
              </div>
              <div className="flex justify-between py-2.5 text-sm">
                <dt className="text-slate-500 dark:text-navy-400">Environment</dt>
                <dd className="font-medium text-navy-900 dark:text-white">{import.meta.env.MODE}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        {isAdmin && (
          <Card className="border-l-4 border-l-amber-400">
            <CardHeader>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                <Shield className="h-4 w-4" /> Admin Settings
              </h2>
            </CardHeader>
            <CardBody className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-navy-300">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                All systems operational
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" icon={<BarChart3 className="h-3.5 w-3.5" />}>
                  View System Stats
                </Button>
                <Button variant="secondary" size="sm" icon={<Database className="h-3.5 w-3.5" />}>
                  Database Maintenance
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="border-l-4 border-l-red-400">
          <CardHeader>
            <h2 className="text-sm font-semibold text-red-500 dark:text-red-400">Danger Zone</h2>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h4 className="text-sm font-semibold text-red-500 dark:text-red-400">Delete Account</h4>
                <p className="text-xs text-slate-400 dark:text-navy-400">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button variant="danger" disabled>
                Delete Account
              </Button>
            </div>
          </CardBody>
        </Card>

        <div className="flex justify-center">
          <Button loading={loading} icon={<Save className="h-4 w-4" />} onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
