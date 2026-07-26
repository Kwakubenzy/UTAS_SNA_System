import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { Building2 } from 'lucide-react';
import type { DepartmentDatum } from '../../../hooks/useDashboardData';

const AXIS_TICK = { fontSize: 12, fill: 'var(--tick-color, #64748b)' };

export const DepartmentChart: React.FC<{ data: DepartmentDatum[] }> = ({ data }) => (
  <Card>
    <CardHeader>
      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Student distribution by department</h3>
    </CardHeader>
    <CardBody>
      {data.length === 0 ? (
        <EmptyState icon={Building2} title="No department data" description="Import students to see this chart." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-navy-700" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 16)}…` : v)}
            />
            <Tooltip
              cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={20} name="Students" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardBody>
  </Card>
);
