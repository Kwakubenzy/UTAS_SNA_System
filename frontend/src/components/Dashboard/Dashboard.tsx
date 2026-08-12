import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import type { LucideIcon } from 'lucide-react';
import {
  Users,
  Link2,
  Crown,
  Boxes,
  TrendingUp,
  Waypoints,
  ClipboardList,
  RefreshCw,
  FileUp,
  UserPlus,
  FileText,
  UserMinus,
  Unlink2,
  Target,
  Trash2,
  BarChart3,
  Activity,
  Share2,
  BrainCircuit,
} from 'lucide-react';
import api from '../../services/api';
import { CreateCampaignRequest, Party } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { StatCard } from '../ui/StatCard';
import { StatCardSkeleton, CardSkeleton } from '../ui/Skeleton';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { ExpertAdviceModal } from '../Analysis/ExpertAdviceModal';
import { DepartmentChart } from './charts/DepartmentChart';
import { CommunityChart } from './charts/CommunityChart';
import { StrengthChart } from './charts/StrengthChart';
import { CentralityComparisonChart } from './charts/CentralityComparisonChart';

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  student_created: UserPlus,
  student_deleted: UserMinus,
  connection_created: Link2,
  connection_deleted: Unlink2,
  campaign_created: Target,
  campaign_deleted: Trash2,
  analysis_run: BarChart3,
  data_imported: FileUp,
};

const TIER_ORDER: Array<{ key: 'High' | 'Medium' | 'Low'; color: string }> = [
  { key: 'High', color: 'var(--tier-high)' },
  { key: 'Medium', color: 'var(--tier-medium)' },
  { key: 'Low', color: 'var(--tier-low)' },
];

const formatRelativeTime = (isoString: string) => {
  const then = new Date(isoString).getTime();
  const diffSeconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSeconds < 60) return 'just now';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(isoString).toLocaleDateString();
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canEdit = user?.role === 'admin' || user?.role === 'campaign_manager';
  const canPlanCampaign = canEdit;
  const {
    stats,
    activity,
    topInfluencer,
    topInfluencers,
    departmentData,
    communityData,
    strengthData,
    loading,
    refresh,
  } = useDashboardData();

  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAdvice, setShowAdvice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxTierCount = Math.max(stats.tierCounts.High, stats.tierCounts.Medium, stats.tierCounts.Low, 1);
  const [buildingPlan, setBuildingPlan] = useState(false);

  const handleCreateCampaignPlan = async () => {
    if (stats.totalStudents === 0) {
      toast.error('Import students and run analysis first — there is no network to build a plan from yet.');
      return;
    }
    if (!topInfluencer) {
      toast.error('Run analysis first — a campaign needs a suggested manager drawn from the influencer rankings.');
      return;
    }

    setBuildingPlan(true);
    try {
      let bridgeNames: string[] = [];
      try {
        const bridgeResp = await api.getBridgeNodes();
        bridgeNames = (bridgeResp.bridge_nodes || [])
          .slice(0, 2)
          .map((b: { student: { name: string } }) => b.student.name);
      } catch {
        // Non-fatal -- the plan still works without named bridge nodes.
      }

      const influencerNames = topInfluencers.slice(0, 3).map((i) => i.student.name);
      const targetParty = topInfluencer.student.party || null;

      const steps: string[] = [];
      steps.push(
        `1. Target base: ${targetParty ? `${targetParty} supporters and undecided students` : 'the full student network'} across ${stats.totalStudents} students and ${stats.communities} detected communities.`
      );
      steps.push(
        influencerNames.length > 0
          ? `2. Message amplification: prioritize outreach through the top ${influencerNames.length} influencers — ${influencerNames.join(', ')} — they reach the largest share of the network directly.`
          : '2. Message amplification: run analysis to identify top influencers to prioritize for outreach.'
      );
      steps.push(
        bridgeNames.length > 0
          ? `3. Cross-community reach: engage bridge students ${bridgeNames.join(', ')} — they connect otherwise separate communities, so their support carries the message across group boundaries.`
          : `3. Cross-community reach: ${stats.bridgeNodes} bridge node(s) detected — visit the Network Graph page to identify them by name.`
      );
      steps.push(
        `4. Coverage check: with an average degree of ${stats.averageDegree.toFixed(2)}, ${stats.tierCounts.High} students are currently classed as High-influence — treat any community without one of them as under-reached and assign a volunteer there.`
      );

      const description = `Data-driven election plan generated from the current network analysis (${stats.totalStudents} students, ${stats.totalConnections} connections):\n\n${steps.join('\n')}`;
      const campaignName = `Election Plan – ${new Date().toLocaleDateString()}`;

      const payload: CreateCampaignRequest = {
        campaign_id: `PLAN-${Date.now()}`,
        campaign_name: campaignName,
        manager_id: topInfluencer.student.id,
        description,
        target_party: targetParty ? (targetParty as Party) : undefined,
        status: 'planning',
      };

      const response = await api.createCampaign(payload);
      if (response.success && response.campaign) {
        toast.success(`Campaign "${campaignName}" created from the current analysis`);
        navigate('/campaigns');
      } else {
        toast.error(response.error || 'Failed to create campaign');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create campaign');
    } finally {
      setBuildingPlan(false);
    }
  };

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

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Only CSV files can be imported here');
      return;
    }

    setImporting(true);
    try {
      const response = await api.importCSV(file);
      if (response.success) {
        toast.success(
          `Imported ${response.valid_rows ?? 0} of ${response.total_rows ?? 0} rows` +
            (response.invalid_rows ? ` (${response.invalid_rows} skipped)` : '')
        );
        await refresh();
      } else {
        toast.error(response.error || 'Failed to import CSV file');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to import CSV file');
    } finally {
      setImporting(false);
    }
  };

  const QUICK_ACTIONS: Array<{ label: string; icon: LucideIcon; onClick: () => void; loading?: boolean }> = canEdit
    ? [
        { label: 'Run Analysis', icon: RefreshCw, onClick: handleRunAnalysis, loading: runningAnalysis },
        { label: 'Import CSV', icon: FileUp, onClick: () => fileInputRef.current?.click(), loading: importing },
        { label: 'Add Student', icon: UserPlus, onClick: () => navigate('/students', { state: { openAddModal: true } }) },
        { label: 'Manage Connections', icon: Link2, onClick: () => navigate('/connections') },
        { label: 'Generate Report', icon: FileText, onClick: () => navigate('/reports') },
      ]
    : [
        { label: 'View Analysis', icon: BarChart3, onClick: () => navigate('/analysis') },
        { label: 'Network Graph', icon: Share2, onClick: () => navigate('/network') },
        { label: 'View Connections', icon: Link2, onClick: () => navigate('/connections') },
        { label: 'Generate Report', icon: FileText, onClick: () => navigate('/reports') },
      ];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />

      {/* Welcome header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <img src="/utas-logo.png" alt="UTAS logo" className="h-11 w-11 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-navy-900 dark:text-white">Welcome, {user?.full_name}</h1>
            <p className="text-sm text-slate-500 dark:text-navy-300">Social Network Analysis System</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={<BrainCircuit className="h-4 w-4" />} onClick={() => setShowAdvice(true)}>
            Expert Advice
          </Button>
          {canPlanCampaign && (
            <Button icon={<ClipboardList className="h-4 w-4" />} loading={buildingPlan} onClick={handleCreateCampaignPlan}>
              Create Campaign Plan
            </Button>
          )}
        </div>
        <ExpertAdviceModal open={showAdvice} onClose={() => setShowAdvice(false)} />
      </div>

      {/* Stat cards */}
      {loading ? (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <motion.div variants={itemVariants}>
            <StatCard label="Total students" value={stats.totalStudents.toLocaleString()} icon={Users} color="primary" onClick={() => navigate('/students')} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Total connections" value={stats.totalConnections.toLocaleString()} icon={Link2} color="secondary" onClick={() => navigate('/connections')} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Top influencers" value={stats.tierCounts.High.toLocaleString()} icon={Crown} color="warning" onClick={() => navigate('/analysis')} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Communities" value={stats.communities.toLocaleString()} icon={Boxes} color="secondary" onClick={() => navigate('/analysis')} />
          </motion.div>
          <motion.div variants={itemVariants}>
            {/* This is average degree *centrality* (degree / (n-1)), not a
                friend count -- labelling it "Average degree" made a 0.0035
                reading look nonsensical. */}
            <StatCard label="Avg. degree centrality" value={stats.averageDegree.toFixed(4)} icon={TrendingUp} color="neutral" onClick={() => navigate('/analysis')} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard label="Bridge nodes" value={stats.bridgeNodes.toLocaleString()} icon={Waypoints} color="danger" onClick={() => navigate('/network')} />
          </motion.div>
        </motion.div>
      )}

      {/* Charts */}
      {loading ? (
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <DepartmentChart data={departmentData} />
          <CentralityComparisonChart influencers={topInfluencers} />
          <CommunityChart data={communityData} />
          <StrengthChart data={strengthData} />
        </div>
      )}

      {/* Tier distribution + quick actions */}
      <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Influence tier distribution</h3>
          </CardHeader>
          <CardBody>
            {stats.totalStudents === 0 ? (
              <p className="text-sm text-slate-400 dark:text-navy-400">No students yet.</p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {TIER_ORDER.map(({ key, color }) => {
                  const count = stats.tierCounts[key];
                  const pct = (count / maxTierCount) * 100;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="w-16 shrink-0 text-sm font-medium text-slate-500 dark:text-navy-300">{key}</span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-navy-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-r"
                          style={{ background: color }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-sm font-semibold text-navy-900 dark:text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Quick actions</h3>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, onClick, loading: actionLoading }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={actionLoading}
                className="flex flex-col items-start gap-2 rounded-lg border border-slate-200 p-4 text-left text-sm font-medium text-slate-600 transition-colors hover:border-[#1E3A8A]/40 hover:text-[#1E3A8A] disabled:cursor-not-allowed disabled:opacity-60 dark:border-navy-600 dark:text-navy-200 dark:hover:border-blue-500 dark:hover:text-blue-400"
              >
                <Icon className={`h-4.5 w-4.5 ${actionLoading ? 'animate-spin' : ''}`} />
                {label}
              </button>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-navy-900 dark:text-white">Recent activity</h3>
        </CardHeader>
        <CardBody>
          {activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400 dark:text-navy-400">No recent activity</p>
          ) : (
            <ul>
              {activity.map((entry) => {
                const Icon = ACTIVITY_ICONS[entry.action] || Activity;
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-navy-700"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-navy-700 dark:text-navy-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm text-navy-700 dark:text-navy-100">
                      {entry.description}
                      {entry.username && <span className="text-slate-400 dark:text-navy-400"> &middot; {entry.username}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-navy-400">
                      {formatRelativeTime(entry.created_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
