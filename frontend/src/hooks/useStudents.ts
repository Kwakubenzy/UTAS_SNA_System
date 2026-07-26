import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import api from '../services/api';
import { CreateStudentRequest, Student, StudentFilters, UpdateStudentRequest } from '../types';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || error.message || fallback;
  }

  return error instanceof Error ? error.message : fallback;
};

export const useStudents = (filters?: StudentFilters) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const stableFilters = useMemo(
    () => filters,
    [filters?.college, filters?.department, filters?.party, filters?.year]
  );

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.getStudents(stableFilters);
      if (response.success) {
        setStudents(response.students);
      } else {
        setError(response.error || response.message || 'Failed to load students');
      }
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load students'));
    } finally {
      setLoading(false);
    }
  }, [stableFilters]);

  const createStudent = useCallback(async (data: CreateStudentRequest) => {
    setError('');

    try {
      const response = await api.createStudent(data);
      if (response.success && response.student) {
        setStudents((current) => [...current, response.student as Student]);
        return true;
      }

      setError(response.error || response.message || 'Failed to create student');
      return false;
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to create student'));
      return false;
    }
  }, []);

  const updateStudent = useCallback(async (studentId: number, data: UpdateStudentRequest) => {
    setError('');

    try {
      const response = await api.updateStudent(studentId, data);
      if (response.success && response.student) {
        setStudents((current) => current.map((s) => (s.id === studentId ? (response.student as Student) : s)));
        return true;
      }

      setError(response.error || response.message || 'Failed to update student');
      return false;
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to update student'));
      return false;
    }
  }, []);

  const deleteStudent = useCallback(async (studentId: number) => {
    setError('');

    try {
      const response = await api.deleteStudent(studentId);
      if (response.success) {
        setStudents((current) => current.filter((student) => student.id !== studentId));
        return true;
      }

      setError(response.error || response.message || 'Failed to delete student');
      return false;
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to delete student'));
      return false;
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return {
    students,
    loading,
    error,
    setError,
    refresh: fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
  };
};
