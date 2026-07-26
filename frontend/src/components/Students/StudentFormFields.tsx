import React from 'react';
import { Party } from '../../types';
import { FieldWrapper, Input, Select } from '../ui/FormField';

export interface StudentFormState {
  student_id: string;
  name: string;
  tribe: string;
  party: Party;
  college: string;
  department: string;
  year: string;
  email: string;
  phone: string;
}

export const emptyStudentForm: StudentFormState = {
  student_id: '',
  name: '',
  tribe: '',
  party: 'TESCON',
  college: '',
  department: '',
  year: '',
  email: '',
  phone: '',
};

export const COLLEGE_OPTIONS = ['Engineering', 'Business', 'Applied Sciences', 'Education', 'Built Environment'];

export const DEPARTMENT_OPTIONS = [
  'Accounting',
  'Civil Engineering',
  'Computer Science',
  'Electrical Engineering',
  'Finance',
  'History',
  'Information Technology',
  'Marketing',
  'Mathematics',
  'Mechanical Engineering',
];

export const OTHER_VALUE = '__other__';

interface Props {
  form: StudentFormState;
  onChange: (form: StudentFormState) => void;
  showOtherCollege: boolean;
  setShowOtherCollege: (v: boolean) => void;
  showOtherDepartment: boolean;
  setShowOtherDepartment: (v: boolean) => void;
  disableStudentId?: boolean;
}

export const StudentFormFields: React.FC<Props> = ({
  form,
  onChange,
  showOtherCollege,
  setShowOtherCollege,
  showOtherDepartment,
  setShowOtherDepartment,
  disableStudentId,
}) => (
  <>
    <FieldWrapper label="Student ID" htmlFor="student_id" required>
      <Input
        id="student_id"
        value={form.student_id}
        onChange={(e) => onChange({ ...form, student_id: e.target.value })}
        required
        disabled={disableStudentId}
      />
    </FieldWrapper>

    <FieldWrapper label="Name" htmlFor="name" required>
      <Input id="name" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} required />
    </FieldWrapper>

    <FieldWrapper label="Tribe" htmlFor="tribe">
      <Input id="tribe" value={form.tribe} onChange={(e) => onChange({ ...form, tribe: e.target.value })} />
    </FieldWrapper>

    <FieldWrapper label="Party" htmlFor="party">
      <Select id="party" value={form.party} onChange={(e) => onChange({ ...form, party: e.target.value as Party })}>
        <option value="TESCON">TESCON</option>
        <option value="TEIN">TEIN</option>
      </Select>
    </FieldWrapper>

    <FieldWrapper label="College" htmlFor="college">
      <Select
        id="college"
        value={showOtherCollege ? OTHER_VALUE : form.college}
        onChange={(e) => {
          const value = e.target.value;
          if (value === OTHER_VALUE) {
            setShowOtherCollege(true);
            onChange({ ...form, college: '' });
          } else {
            setShowOtherCollege(false);
            onChange({ ...form, college: value });
          }
        }}
        required={!showOtherCollege}
      >
        <option value="">Select college</option>
        {COLLEGE_OPTIONS.map((college) => (
          <option key={college} value={college}>
            {college}
          </option>
        ))}
        <option value={OTHER_VALUE}>Other (specify)</option>
      </Select>
      {showOtherCollege && (
        <Input
          placeholder="Enter college name"
          value={form.college}
          onChange={(e) => onChange({ ...form, college: e.target.value })}
          required
          className="mt-2"
        />
      )}
    </FieldWrapper>

    <FieldWrapper label="Department" htmlFor="department">
      <Select
        id="department"
        value={showOtherDepartment ? OTHER_VALUE : form.department}
        onChange={(e) => {
          const value = e.target.value;
          if (value === OTHER_VALUE) {
            setShowOtherDepartment(true);
            onChange({ ...form, department: '' });
          } else {
            setShowOtherDepartment(false);
            onChange({ ...form, department: value });
          }
        }}
        required={!showOtherDepartment}
      >
        <option value="">Select department</option>
        {DEPARTMENT_OPTIONS.map((department) => (
          <option key={department} value={department}>
            {department}
          </option>
        ))}
        <option value={OTHER_VALUE}>Other (specify)</option>
      </Select>
      {showOtherDepartment && (
        <Input
          placeholder="Enter department name"
          value={form.department}
          onChange={(e) => onChange({ ...form, department: e.target.value })}
          required
          className="mt-2"
        />
      )}
    </FieldWrapper>

    <FieldWrapper label="Year" htmlFor="year" required>
      <Select id="year" value={form.year} onChange={(e) => onChange({ ...form, year: e.target.value })} required>
        <option value="">Select year</option>
        <option value="1">Year 1</option>
        <option value="2">Year 2</option>
        <option value="3">Year 3</option>
        <option value="4">Year 4</option>
      </Select>
    </FieldWrapper>

    <FieldWrapper label="Email" htmlFor="email">
      <Input id="email" type="email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} />
    </FieldWrapper>

    <FieldWrapper label="Phone" htmlFor="phone">
      <Input id="phone" type="tel" value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} />
    </FieldWrapper>
  </>
);
