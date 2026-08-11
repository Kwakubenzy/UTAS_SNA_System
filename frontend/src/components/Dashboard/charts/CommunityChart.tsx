import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { CircleDashed } from 'lucide-react';
import type { CommunityDatum } from '../../../hooks/useDashboardData';

const AXIS_TICK = { fontSize: 12, fill: '#64748b' };

export const CommunityChart: React.FC<{ data: CommunityDatum[] }> = ({ data }) => (
  <Card>
    <CardHeader>
      <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Community distribution</h3>
    </CardHeader>
    <CardBody>
      {data.length === 0 ? (
        <EmptyState icon={CircleDashed} title="No communities yet" description="Run analysis to detect communities." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ left: -16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-navy-700" vertical={false} />
            <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(30, 58, 138, 0.06)' }}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }}
            />
            <Bar dataKey="value" fill="#2F6B00" radius={[4, 4, 0, 0]} maxBarSize={40} name="Members" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </CardBody>
  </Card>
);
