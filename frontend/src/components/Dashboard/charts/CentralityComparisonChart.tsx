import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { Activity } from 'lucide-react';
import type { InfluencerResult } from '../../../types';

const AXIS_TICK = { fontSize: 12, fill: '#64748b' };

interface Props {
  influencers: InfluencerResult[];
}

/** Each centrality metric lives on a wildly different scale (degree ~1e-2,
 * betweenness ~1e-4), so raw values on one axis would flatten everything but
 * one series. Normalize each metric to a % of its own max within the shown
 * set -- the standard trick for comparing differently-scaled measures. */
export const CentralityComparisonChart: React.FC<Props> = ({ influencers }) => {
  const data = useMemo(() => {
    const top = influencers.slice(0, 6);
    if (top.length === 0) return [];

    const maxDegree = Math.max(...top.map((i) => i.metrics.degree_centrality), 1e-9);
    const maxBetweenness = Math.max(...top.map((i) => i.metrics.betweenness_centrality), 1e-9);
    const maxCloseness = Math.max(...top.map((i) => i.metrics.closeness_centrality), 1e-9);
    const maxEigen = Math.max(...top.map((i) => i.metrics.eigenvector_centrality ?? 0), 1e-9);
    const hasEigen = top.some((i) => (i.metrics.eigenvector_centrality ?? 0) > 0);

    return top.map((i) => ({
      name: i.student.name.length > 12 ? `${i.student.name.slice(0, 12)}…` : i.student.name,
      Degree: Math.round((i.metrics.degree_centrality / maxDegree) * 100),
      Betweenness: Math.round((i.metrics.betweenness_centrality / maxBetweenness) * 100),
      Closeness: Math.round((i.metrics.closeness_centrality / maxCloseness) * 100),
      ...(hasEigen ? { Eigenvector: Math.round(((i.metrics.eigenvector_centrality ?? 0) / maxEigen) * 100) } : {}),
    }));
  }, [influencers]);

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Centrality comparison (top students)</h3>
        <p className="mt-0.5 text-xs text-slate-400 dark:text-navy-400">
          Each metric scaled to % of its own max &mdash; scales differ by orders of magnitude
        </p>
      </CardHeader>
      <CardBody>
        {data.length === 0 ? (
          <EmptyState icon={Activity} title="No metrics yet" description="Run analysis to compute centrality scores." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ left: -16, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-100 dark:text-navy-700" vertical={false} />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Degree" fill="#1E3A8A" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="Betweenness" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="Closeness" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Bar dataKey="Eigenvector" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardBody>
    </Card>
  );
};
