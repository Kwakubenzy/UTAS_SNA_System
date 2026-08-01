import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, UserCog } from 'lucide-react';
import api from '../services/api';
import { User } from '../types';
import { usePagination } from '../hooks/usePagination';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';

export const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getAllUsers();
      if (response.success) {
        setUsers(response.users || []);
      } else {
        toast.error(response.error || 'Failed to load users');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filteredUsers, 10);

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const response = await api.assignRole(userId, newRole);
      if (response.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
        toast.success('Role updated');
      } else {
        toast.error(response.error || 'Failed to update user role');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update user role');
    }
  };

  const handleToggleActive = async (userId: number, currentlyActive: boolean) => {
    const nextActive = !currentlyActive;
    if (!window.confirm(nextActive ? 'Reactivate this user?' : 'Deactivate this user?')) return;
    try {
      const response = await api.setUserStatus(userId, nextActive);
      if (response.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: nextActive } : u)));
        toast.success(nextActive ? 'User reactivated' : 'User deactivated');
      } else {
        toast.error(response.error || response.message || 'Failed to update user status');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update user status');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
          <UserCog className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-navy-900 dark:text-white">Users Management</h1>
          <p className="text-sm text-slate-500 dark:text-navy-300">{totalItems} user{totalItems !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name, username, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="sm:w-48">
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="campaign_manager">Campaign Manager</option>
            <option value="student">Student</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState icon={UserCog} title="No users found" description="Try adjusting your search or filter." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-navy-700 dark:text-navy-400">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Username</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-navy-700/60 dark:hover:bg-navy-700/30 ${
                        !user.is_active ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-navy-900 dark:text-white">{user.full_name}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-navy-300">{user.username}</td>
                      <td className="px-5 py-3 text-slate-500 dark:text-navy-300">{user.email}</td>
                      <td className="px-5 py-3">
                        <Select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={!user.is_active}
                          className="w-auto py-1.5 text-xs"
                        >
                          <option value="student">Student</option>
                          <option value="campaign_manager">Campaign Manager</option>
                          <option value="admin">Admin</option>
                        </Select>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={user.is_active ? 'emerald' : 'rose'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-navy-300">{new Date(user.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          className={
                            user.is_active
                              ? 'rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10'
                              : 'rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
                          }
                        >
                          {user.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>
    </motion.div>
  );
};
