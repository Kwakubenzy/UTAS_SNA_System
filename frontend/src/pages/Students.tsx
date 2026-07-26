import React, { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Plus, Pencil, Trash2, Users as UsersIcon, ArrowUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStudents } from '../hooks/useStudents';
import { usePagination } from '../hooks/usePagination';
import { CreateStudentRequest, Student } from '../types';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/FormField';
import { PartyBadge, Badge } from '../components/ui/Badge';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import {
  StudentFormFields,
  StudentFormState,
  emptyStudentForm,
  COLLEGE_OPTIONS,
  DEPARTMENT_OPTIONS,
} from '../components/Students/StudentFormFields';

const optionalValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const toFormState = (student: Student): StudentFormState => ({
  student_id: student.student_id,
  name: student.name,
  tribe: student.tribe || '',
  party: student.party || 'TESCON',
  college: student.college || '',
  department: student.department || '',
  year: student.year ? String(student.year) : '',
  email: student.email || '',
  phone: student.phone || '',
});

const isProfileComplete = (student: Student) =>
  Boolean(student.college && student.department && student.year && student.email);

type SortKey = 'student_id' | 'name' | 'college' | 'department' | 'year';

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'name', label: 'Name' },
  { key: 'college', label: 'College' },
  { key: 'department', label: 'Department' },
  { key: 'year', label: 'Year' },
];

export const Students: React.FC = () => {
  const { students, loading, createStudent, updateStudent, deleteStudent } = useStudents();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'campaign_manager';

  const [searchTerm, setSearchTerm] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState<StudentFormState>(emptyStudentForm);
  const [addShowOtherCollege, setAddShowOtherCollege] = useState(false);
  const [addShowOtherDepartment, setAddShowOtherDepartment] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState<StudentFormState>(emptyStudentForm);
  const [editShowOtherCollege, setEditShowOtherCollege] = useState(false);
  const [editShowOtherDepartment, setEditShowOtherDepartment] = useState(false);

  const openAddModal = () => {
    setNewStudent(emptyStudentForm);
    setAddShowOtherCollege(false);
    setAddShowOtherDepartment(false);
    setShowAddModal(true);
  };

  const closeAddModal = () => setShowAddModal(false);

  const openEditModal = (student: Student) => {
    const form = toFormState(student);
    setEditForm(form);
    setEditShowOtherCollege(!!form.college && !COLLEGE_OPTIONS.includes(form.college));
    setEditShowOtherDepartment(!!form.department && !DEPARTMENT_OPTIONS.includes(form.department));
    setEditingStudent(student);
  };

  const closeEditModal = () => setEditingStudent(null);

  // Picks up a search term forwarded from the top-bar search box (?q=...)
  // and an "open the Add Student modal" request from the Dashboard's quick actions.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q) setSearchTerm(q);

    if (canEdit && (location.state as { openAddModal?: boolean } | null)?.openAddModal) {
      openAddModal();
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredStudents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const filtered = students.filter((student) => {
      if (partyFilter && student.party !== partyFilter) return false;
      if (collegeFilter && student.college !== collegeFilter) return false;
      if (yearFilter && String(student.year) !== yearFilter) return false;

      if (!query) return true;

      const searchableFields = [
        student.student_id,
        student.name,
        student.email,
        student.phone,
        student.tribe,
        student.party,
        student.college,
        student.department,
        String(student.year),
      ];

      return searchableFields.some((field) => field?.toLowerCase().includes(query));
    });

    const getValue = (s: Student): string | number => {
      if (sortKey === 'year') return s.year ?? 0;
      return (s[sortKey] || '').toString().toLowerCase();
    };

    return [...filtered].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [searchTerm, partyFilter, collegeFilter, yearFilter, students, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filteredStudents, 10);

  const collegeChoices = useMemo(
    () => Array.from(new Set(students.map((s) => s.college).filter(Boolean))) as string[],
    [students]
  );

  const allOnPageSelected = pageItems.length > 0 && pageItems.every((s) => selectedIds.has(s.id));

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageItems.forEach((s) => next.delete(s.id));
      } else {
        pageItems.forEach((s) => next.add(s.id));
      }
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected student${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;

    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    const results = await Promise.all(ids.map((id) => deleteStudent(id)));
    setBulkDeleting(false);

    const succeeded = results.filter(Boolean).length;
    if (succeeded > 0) toast.success(`Deleted ${succeeded} student${succeeded !== 1 ? 's' : ''}`);
    if (succeeded < ids.length) toast.error(`Failed to delete ${ids.length - succeeded} student${ids.length - succeeded !== 1 ? 's' : ''}`);
    setSelectedIds(new Set());
  };

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const year = Number.parseInt(newStudent.year, 10);
    if (!Number.isInteger(year) || year < 1 || year > 4) {
      toast.error('Year must be between 1 and 4');
      return;
    }

    const payload: CreateStudentRequest = {
      student_id: newStudent.student_id.trim(),
      name: newStudent.name.trim(),
      party: newStudent.party,
      college: newStudent.college.trim(),
      department: newStudent.department.trim(),
      year,
      tribe: optionalValue(newStudent.tribe),
      email: optionalValue(newStudent.email),
      phone: optionalValue(newStudent.phone),
    };

    setSaving(true);
    const created = await createStudent(payload);
    setSaving(false);
    if (created) {
      toast.success('Student added');
      closeAddModal();
    } else {
      toast.error('Failed to add student');
    }
  };

  const handleEditStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingStudent) return;

    const year = Number.parseInt(editForm.year, 10);
    if (!Number.isInteger(year) || year < 1 || year > 4) {
      toast.error('Year must be between 1 and 4');
      return;
    }

    setSaving(true);
    const updated = await updateStudent(editingStudent.id, {
      name: editForm.name.trim(),
      party: editForm.party,
      college: editForm.college.trim(),
      department: editForm.department.trim(),
      year,
      tribe: optionalValue(editForm.tribe),
      email: optionalValue(editForm.email),
      phone: optionalValue(editForm.phone),
    });
    setSaving(false);
    if (updated) {
      toast.success('Student updated');
      closeEditModal();
    } else {
      toast.error('Failed to update student');
    }
  };

  const handleDelete = async (student: Student) => {
    if (!window.confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    const ok = await deleteStudent(student.id);
    if (ok) {
      toast.success('Student deleted');
    } else {
      toast.error('Failed to delete student');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
            <UsersIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900 dark:text-white">Students Management</h1>
            <p className="text-sm text-slate-500 dark:text-navy-300">{totalItems} student{totalItems !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {canEdit && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
            Add Student
          </Button>
        )}
      </div>

      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by ID, name, party, college, department, or year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="sm:w-40">
            <option value="">All parties</option>
            <option value="TESCON">TESCON</option>
            <option value="TEIN">TEIN</option>
          </Select>
          <Select value={collegeFilter} onChange={(e) => setCollegeFilter(e.target.value)} className="sm:w-48">
            <option value="">All colleges</option>
            {collegeChoices.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
          <Select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="sm:w-32">
            <option value="">All years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </Select>
        </div>
      </Card>

      {canEdit && selectedIds.size > 0 && (
        <Card className="mb-4 flex items-center justify-between gap-3 border-[#1E3A8A]/20 bg-blue-50/60 p-3.5 dark:bg-blue-500/5">
          <p className="text-sm font-medium text-navy-800 dark:text-navy-100">
            {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} loading={bulkDeleting} onClick={handleBulkDelete}>
              Delete selected
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <TableSkeleton rows={6} cols={8} />
        ) : filteredStudents.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No students found"
            description={canEdit ? 'Try adjusting your filters, or add your first student.' : 'Try adjusting your filters.'}
            action={
              canEdit ? (
                <Button icon={<Plus className="h-4 w-4" />} onClick={openAddModal}>
                  Add Student
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
                    {canEdit && (
                      <th className="w-10 px-5 py-3">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAllOnPage}
                          className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                          aria-label="Select all on page"
                        />
                      </th>
                    )}
                    {COLUMNS.map((col) => (
                      <th key={col.key} className="px-5 py-3 font-medium">
                        <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-navy-700 dark:hover:text-white">
                          {col.label}
                          <ArrowUpDown className={`h-3 w-3 ${sortKey === col.key ? 'text-[#2563EB]' : 'text-slate-300'}`} />
                        </button>
                      </th>
                    ))}
                    <th className="px-5 py-3 font-medium">Party</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Contact</th>
                    {canEdit && <th className="px-5 py-3 font-medium text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((student) => (
                    <tr
                      key={student.id}
                      className={`border-b border-slate-50 last:border-0 hover:bg-slate-50 dark:border-navy-700/60 dark:hover:bg-navy-700/30 ${
                        selectedIds.has(student.id) ? 'bg-blue-50/50 dark:bg-blue-500/5' : 'odd:bg-white even:bg-slate-50/60 dark:even:bg-navy-900/30'
                      }`}
                    >
                      {canEdit && (
                        <td className="px-5 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(student.id)}
                            onChange={() => toggleSelect(student.id)}
                            className="h-4 w-4 rounded border-slate-300 text-[#1E3A8A] focus:ring-[#1E3A8A]"
                            aria-label={`Select ${student.name}`}
                          />
                        </td>
                      )}
                      <td className="px-5 py-3 font-medium text-navy-900 dark:text-white">{student.student_id}</td>
                      <td className="px-5 py-3 text-navy-700 dark:text-navy-100">{student.name}</td>
                      <td className="px-5 py-3">
                        {student.college ? <Badge tone="navy">{student.college}</Badge> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        {student.department ? <Badge tone="slate">{student.department}</Badge> : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-navy-300">{student.year ?? '—'}</td>
                      <td className="px-5 py-3"><PartyBadge party={student.party} /></td>
                      <td className="px-5 py-3">
                        <Badge tone={isProfileComplete(student) ? 'emerald' : 'amber'}>
                          {isProfileComplete(student) ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-navy-300">
                        <div className="flex flex-col">
                          <span>{student.email || '—'}</span>
                          {student.phone && <span className="text-xs text-slate-400">{student.phone}</span>}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => openEditModal(student)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-500/10 dark:hover:text-blue-400"
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(student)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                              aria-label="Delete"
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

      <Modal open={showAddModal} onClose={closeAddModal} title="Add Student">
        <form onSubmit={handleAddStudent}>
          <StudentFormFields
            form={newStudent}
            onChange={setNewStudent}
            showOtherCollege={addShowOtherCollege}
            setShowOtherCollege={setAddShowOtherCollege}
            showOtherDepartment={addShowOtherDepartment}
            setShowOtherDepartment={setAddShowOtherDepartment}
          />
          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">
              Add Student
            </Button>
            <Button type="button" variant="secondary" onClick={closeAddModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editingStudent} onClose={closeEditModal} title="Edit Student">
        <form onSubmit={handleEditStudent}>
          <StudentFormFields
            form={editForm}
            onChange={setEditForm}
            showOtherCollege={editShowOtherCollege}
            setShowOtherCollege={setEditShowOtherCollege}
            showOtherDepartment={editShowOtherDepartment}
            setShowOtherDepartment={setEditShowOtherDepartment}
            disableStudentId
          />
          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">
              Save Changes
            </Button>
            <Button type="button" variant="secondary" onClick={closeEditModal}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
};
