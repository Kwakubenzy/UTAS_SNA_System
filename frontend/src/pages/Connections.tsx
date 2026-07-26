import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Link2, Plus, Trash2, Search, SlidersHorizontal } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useStudents } from '../hooks/useStudents';
import { usePagination } from '../hooks/usePagination';
import { ConnectionListItem, CreateConnectionRequest } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Input, Select, FieldWrapper } from '../components/ui/FormField';
import { Badge, StrengthBadge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';

const RELATIONSHIP_PRESETS = ['Friend', 'Close Friend', 'Best Friend', 'Acquaintance', 'Colleague', 'Study Group'];

const emptyForm = {
  from_student_id: '',
  to_student_id: '',
  strength: '3',
  relationship_type: 'Friend',
};

export const Connections: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'campaign_manager';
  const { students } = useStudents();
  const [connections, setConnections] = useState<ConnectionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [minStrength, setMinStrength] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const response = await api.getConnections();
      if (response.success) {
        setConnections(response.connections || []);
      } else {
        toast.error(response.error || 'Failed to load connections');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const relationshipTypes = useMemo(
    () => Array.from(new Set(connections.map((c) => c.connection.relationship_type).filter(Boolean))) as string[],
    [connections]
  );

  const filteredConnections = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return connections.filter((c) => {
      if (filterType !== 'all' && c.connection.relationship_type !== filterType) return false;
      if (minStrength !== 'all' && c.connection.strength < Number(minStrength)) return false;
      if (!query) return true;
      return (
        c.from_student.name.toLowerCase().includes(query) ||
        c.to_student.name.toLowerCase().includes(query)
      );
    });
  }, [connections, filterType, minStrength, searchTerm]);

  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filteredConnections, 10);

  const openModal = () => {
    setForm(emptyForm);
    setShowModal(true);
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.from_student_id || !form.to_student_id) {
      toast.error('Select both students');
      return;
    }
    if (form.from_student_id === form.to_student_id) {
      toast.error('A student cannot be connected to themselves');
      return;
    }

    const payload: CreateConnectionRequest = {
      from_student_id: Number(form.from_student_id),
      to_student_id: Number(form.to_student_id),
      strength: Number(form.strength),
      relationship_type: form.relationship_type || undefined,
    };

    setSaving(true);
    try {
      const response = await api.createConnection(payload);
      if (response.success) {
        toast.success('Connection added');
        setShowModal(false);
        await fetchConnections();
      } else {
        toast.error(response.error || 'Failed to create connection');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create connection');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (connectionId: number) => {
    if (!window.confirm('Remove this connection?')) return;
    try {
      const response = await api.deleteConnection(connectionId);
      if (response.success) {
        setConnections((prev) => prev.filter((c) => c.connection.id !== connectionId));
        toast.success('Connection removed');
      } else {
        toast.error(response.error || 'Failed to delete connection');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete connection');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900 dark:text-white">Student Connections</h1>
            <p className="text-sm text-slate-500 dark:text-navy-300">{totalItems} connection{totalItems !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canEdit && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openModal}>
            Add Connection
          </Button>
        )}
      </div>

      <Card className="mb-5 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-navy-400">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by student name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="sm:w-56">
            <option value="all">All relationship types</option>
            {relationshipTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select value={minStrength} onChange={(e) => setMinStrength(e.target.value)} className="sm:w-44">
            <option value="all">Any strength</option>
            <option value="2">2+ strength</option>
            <option value="3">3+ strength</option>
            <option value="4">4+ strength</option>
            <option value="5">5 only</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filteredConnections.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No connections found"
            description={
              canEdit ? 'Add a connection, or import students with relationships from the Analysis page.' : 'No connections have been added yet.'
            }
            action={
              canEdit ? (
                <Button icon={<Plus className="h-4 w-4" />} onClick={openModal}>
                  Add Connection
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white dark:bg-navy-800">
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-navy-700 dark:text-navy-400">
                    <th className="px-5 py-3 font-medium">Student 1</th>
                    <th className="px-5 py-3 font-medium">Student 2</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Strength</th>
                    {canEdit && <th className="px-5 py-3 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map(({ connection, from_student, to_student }) => (
                    <tr
                      key={connection.id}
                      className="border-b border-slate-50 last:border-0 odd:bg-white even:bg-slate-50/60 hover:bg-slate-100 dark:border-navy-700/60 dark:even:bg-navy-900/30 dark:hover:bg-navy-700/30"
                    >
                      <td className="px-5 py-3 font-medium text-navy-900 dark:text-white">{from_student.name}</td>
                      <td className="px-5 py-3 font-medium text-navy-900 dark:text-white">{to_student.name}</td>
                      <td className="px-5 py-3">
                        <Badge tone="blue">{connection.relationship_type || 'General'}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <StrengthBadge strength={connection.strength} />
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDelete(connection.id)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              aria-label="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Connection">
        <form onSubmit={handleCreate}>
          <FieldWrapper label="From student" htmlFor="from_student_id" required>
            <Select
              id="from_student_id"
              value={form.from_student_id}
              onChange={(e) => setForm({ ...form, from_student_id: e.target.value })}
              required
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_id})
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="To student" htmlFor="to_student_id" required>
            <Select
              id="to_student_id"
              value={form.to_student_id}
              onChange={(e) => setForm({ ...form, to_student_id: e.target.value })}
              required
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_id})
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Relationship type" htmlFor="relationship_type">
            <Select
              id="relationship_type"
              value={form.relationship_type}
              onChange={(e) => setForm({ ...form, relationship_type: e.target.value })}
            >
              {RELATIONSHIP_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Strength (1–5)" htmlFor="strength" required>
            <input
              id="strength"
              type="range"
              min={1}
              max={5}
              value={form.strength}
              onChange={(e) => setForm({ ...form, strength: e.target.value })}
              className="w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>1</span>
              <span className="font-semibold text-navy-700 dark:text-navy-200">{form.strength}</span>
              <span>5</span>
            </div>
          </FieldWrapper>

          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">
              Add Connection
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
