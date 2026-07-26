import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BarChart3,
  RefreshCw,
  FileUp,
  FileDown,
  Download,
  Share2,
  Waypoints,
  GitBranch,
  Target,
  TrendingUp,
  Award,
  Boxes,
  ArrowUpDown,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { LucideIcon } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useAnalysisData, CommunityEntry } from '../hooks/useAnalysisData';
import { Button } from '../components/ui/Button';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { StatCardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { downloadCsv } from '../utils/csvExport';
import { InfluencerResult } from '../types';

const EXCEL_EXTENSIONS = ['.xlsx', '.xls'];

interface RankRow {
  name: string;
  value: number;
}

const CENTRALITY_METRICS: Array<{
  key: string;
  title: string;
  icon: LucideIcon;
  description: string;
  getValue: (i: InfluencerResult) => number;
}> = [
  {
    key: 'degree_centrality',
    title: 'Degree Centrality',
    icon: Share2,
    description: 'Counts each student\'s direct friendships. A simple, immediate measure of how connected someone is within the network.',
    getValue: (i) => i.metrics.degree_centrality,
  },
  {
    key: 'betweenness_centrality',
    title: 'Betweenness Centrality',
    icon: GitBranch,
    description: 'Measures how often a student lies on the shortest path between two other students — high scores identify brokers who connect otherwise separate groups.',
    getValue: (i) => i.metrics.betweenness_centrality,
  },
  {
    key: 'closeness_centrality',
    title: 'Closeness Centrality',
    icon: Target,
    description: 'Measures how quickly a student can reach everyone else in the network through the fewest hops — high scores indicate well-positioned, central students.',
    getValue: (i) => i.metrics.closeness_centrality,
  },
  {
    key: 'eigenvector_centrality',
    title: 'Eigenvector Centrality',
    icon: TrendingUp,
    description: 'Weighs influence by the quality of connections — being friends with other well-connected students raises this score more than many weak links would.',
    getValue: (i) => i.metrics.eigenvector_centrality ?? 0,
  },
  {
    key: 'pagerank_score',
    title: 'PageRank',
    icon: Award,
    description: 'The PageRank algorithm applied to the friendship graph — reflects overall importance, weighted by the strength of incoming connections.',
    getValue: (i) => i.metrics.pagerank_score,
  },
];

const formatScore = (v: number) => v.toFixed(4);

const MetricCard: React.FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  data: RankRow[];
  format?: (v: number) => string;
  onExport: () => void;
}> = ({ icon: Icon, title, description, data, format = formatScore, onExport }) => (
  <Card>
    <CardHeader className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <h3 className="text-sm font-semibold text-navy-900 dark:text-white">{title}</h3>
      </div>
      <button
        onClick={onExport}
        disabled={data.length === 0}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-navy-600 dark:text-navy-200 dark:hover:bg-navy-700"
      >
        <Download className="h-3.5 w-3.5" /> Export
      </button>
    </CardHeader>
    <CardBody>
      <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-navy-300">{description}</p>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-navy-400">No data yet — run analysis first.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={92}
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickLine={false}
                />
                <Tooltip formatter={(v: any) => format(Number(v))} contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 12 }} />
                <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ol className="space-y-1">
            {data.map((row, idx) => (
              <li
                key={`${row.name}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 odd:bg-slate-50 dark:odd:bg-navy-900/40"
              >
                <span className="flex min-w-0 items-center gap-2 text-navy-700 dark:text-navy-100">
                  <span className="w-5 shrink-0 text-xs font-semibold text-slate-400 dark:text-navy-500">{idx + 1}</span>
                  <span className="truncate text-sm">{row.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-xs font-medium text-slate-500 dark:text-navy-300">{format(row.value)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </CardBody>
  </Card>
);

export const Analysis: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'campaign_manager';
  const { overview, influencers, communities, bridgeNodes, loading, refresh } = useAnalysisData();
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [importing, setImporting] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const topByMetric = useMemo(() => {
    const result: Record<string, RankRow[]> = {};
    CENTRALITY_METRICS.forEach((metric) => {
      result[metric.key] = [...influencers]
        .sort((a, b) => metric.getValue(b) - metric.getValue(a))
        .slice(0, 10)
        .map((i) => ({ name: i.student.name, value: metric.getValue(i) }));
    });
    return result;
  }, [influencers]);

  const bridgeRows: RankRow[] = useMemo(
    () =>
      [...bridgeNodes]
        .sort((a, b) => b.betweenness_centrality - a.betweenness_centrality)
        .slice(0, 10)
        .map((b) => ({ name: b.student.name, value: b.betweenness_centrality })),
    [bridgeNodes]
  );

  const communityRows: RankRow[] = useMemo(
    () => communities.slice(0, 10).map((c) => ({ name: `Community ${c.community_id}`, value: c.size })),
    [communities]
  );

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    try {
      const response = await api.runAnalysis();
      if (response.success) {
        toast.success('Analysis completed successfully');
        await refresh();
      } else {
        toast.error(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to run analysis');
    } finally {
      setRunningAnalysis(false);
    }
  };

  const handleDownloadReport = async () => {
    setDownloadingReport(true);
    try {
      const blob = await api.downloadReport();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sna_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to generate report');
    } finally {
      setDownloadingReport(false);
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!EXCEL_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
      toast.error('Only Excel files (.xlsx or .xls) can be imported');
      return;
    }

    setImporting(true);
    try {
      const response = await api.importExcel(file);
      if (response.success) {
        toast.success(
          `Imported ${response.valid_rows ?? 0} of ${response.total_rows ?? 0} rows` +
            (response.invalid_rows ? ` (${response.invalid_rows} skipped)` : '')
        );
        if (response.errors?.length) {
          const preview = response.errors
            .slice(0, 5)
            .map((e: { row: number; error: string }) => `Row ${e.row}: ${e.error}`)
            .join('\n');
          toast(`Some rows were skipped:\n${preview}${response.errors.length > 5 ? '\n…' : ''}`, {
            duration: 8000,
          });
        }
        await refresh();
      } else {
        toast.error(response.error || 'Failed to import Excel file');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to import Excel file');
    } finally {
      setImporting(false);
    }
  };

  const exportRanking = (title: string, rows: RankRow[]) => {
    downloadCsv(
      `${title.toLowerCase().replace(/\s+/g, '_')}.csv`,
      ['Rank', 'Name', 'Value'],
      rows.map((r, idx) => [idx + 1, r.name, r.value])
    );
  };

  const exportCommunities = () => {
    downloadCsv(
      'community_detection.csv',
      ['Community', 'Size', 'TESCON', 'TEIN'],
      communities.map((c: CommunityEntry) => [c.community_id, c.size, c.party_breakdown.TESCON, c.party_breakdown.TEIN])
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900 dark:text-white">Social Network Analysis</h1>
            <p className="text-sm text-slate-500 dark:text-navy-300">Centrality, communities, and bridge nodes</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} loading={runningAnalysis} onClick={handleRunAnalysis}>
                Refresh Analysis
              </Button>
              <Button variant="secondary" size="sm" icon={<FileUp className="h-4 w-4" />} loading={importing} onClick={() => fileInputRef.current?.click()}>
                Import Excel
              </Button>
            </>
          )}
          <Button size="sm" icon={<FileDown className="h-4 w-4" />} loading={downloadingReport} disabled={!overview} onClick={handleDownloadReport}>
            Export PDF
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      </div>

      {loading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : !overview ? (
        <EmptyState
          icon={BarChart3}
          title="No analysis data available"
          description={
            canEdit
              ? 'Import students and connections, then run analysis to see network metrics.'
              : 'An admin or campaign manager needs to import data and run analysis first.'
          }
          action={
            canEdit ? (
              <Button loading={runningAnalysis} onClick={handleRunAnalysis} icon={<RefreshCw className="h-4 w-4" />}>
                Run Analysis
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total nodes" value={overview.totalNodes} icon={BarChart3} color="primary" />
            <StatCard label="Total edges" value={overview.totalEdges} icon={Share2} color="success" onClick={() => navigate('/network')} />
            <StatCard label="Network density" value={overview.density.toFixed(4)} icon={ArrowUpDown} color="warning" />
            <StatCard label="Avg. clustering" value={overview.avgClustering.toFixed(4)} icon={Boxes} color="secondary" />
            <StatCard label="Communities" value={`${overview.communities} (max ${overview.largestCommunity})`} icon={Boxes} color="neutral" />
            <StatCard label="Bridge nodes" value={overview.bridgeNodeCount} icon={Waypoints} color="danger" />
          </div>

          {loading ? (
            <TableSkeleton />
          ) : influencers.length === 0 ? (
            <EmptyState icon={BarChart3} title="No metrics yet" description="Run analysis to compute centrality scores." />
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {CENTRALITY_METRICS.map((metric) => (
                <MetricCard
                  key={metric.key}
                  icon={metric.icon}
                  title={metric.title}
                  description={metric.description}
                  data={topByMetric[metric.key]}
                  onExport={() => exportRanking(metric.title, topByMetric[metric.key])}
                />
              ))}

              <MetricCard
                icon={Waypoints}
                title="Bridge Nodes"
                description="Students whose removal would fragment the network into disconnected groups — identified by high betweenness centrality between communities."
                data={bridgeRows}
                onExport={() => exportRanking('Bridge Nodes', bridgeRows)}
              />

              <Card>
                <CardHeader className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1E3A8A] dark:bg-blue-500/10 dark:text-blue-300">
                      <Boxes className="h-[18px] w-[18px]" />
                    </span>
                    <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Community Detection</h3>
                  </div>
                  <button
                    onClick={exportCommunities}
                    disabled={communities.length === 0}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-navy-600 dark:text-navy-200 dark:hover:bg-navy-700"
                  >
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                </CardHeader>
                <CardBody>
                  <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-navy-300">
                    Groups of students who are more densely connected to each other than to the rest of the network, detected with the
                    Louvain algorithm.
                  </p>
                  {communities.length === 0 ? (
                    <p className="py-8 text-center text-sm text-slate-400 dark:text-navy-400">No communities detected</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div style={{ height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={communityRows} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                            <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 12 }} />
                            <Bar dataKey="value" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="space-y-1">
                        {communities.slice(0, 10).map((c) => (
                          <li key={c.community_id} className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 odd:bg-slate-50 dark:odd:bg-navy-900/40">
                            <span className="text-sm font-medium text-navy-700 dark:text-navy-100">Community {c.community_id}</span>
                            <span className="shrink-0 text-xs text-slate-500 dark:text-navy-300">
                              {c.size} members &middot; {c.party_breakdown.TESCON} TESCON / {c.party_breakdown.TEIN} TEIN
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          )}

          <Card className="mt-6 flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-navy-900 dark:text-white">Want to see the graph itself?</p>
              <p className="text-xs text-slate-500 dark:text-navy-300">Explore the full interactive network visualization.</p>
            </div>
            <Button variant="secondary" size="sm" icon={<Share2 className="h-4 w-4" />} onClick={() => navigate('/network')}>
              Open Network Graph
            </Button>
          </Card>
        </>
      )}
    </motion.div>
  );
};
