import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { Link2 } from 'lucide-react';
import type { StrengthDatum } from '../../../hooks/useDashboardData';

const AXIS_TICK = { fontSize: 12, fill: '#64748b' };

export const StrengthChart: React.FC<{ data: StrengthDatum[] }> = ({ data }) => (
  <Card>
    <CardHeader>
      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Friendship strength distribution</h3>
    </CardHeader>
    <CardBody>
      {data.length === 0 ? (
        <EmptyState icon={Link2} title="No connections yet" description="Add connections to see this chart." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ left: -16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-navy-700" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(16, 185, 129, 0.06)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} name="Connections" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardBody>
  </Card>
);
