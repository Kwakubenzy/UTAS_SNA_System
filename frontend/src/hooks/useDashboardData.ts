import { useEffect, useState } from 'react';
import api from '../services/api';
import { InfluencerResult } from '../types';

export interface TierCounts {
  High: number;
  Medium: number;
  Low: number;
}

export interface DashboardStats {
  totalStudents: number;
  totalConnections: number;
  communities: number;
  bridgeNodes: number;
  averageDegree: number;
  tierCounts: TierCounts;
}

export interface ActivityEntry {
  id: number;
  action: string;
  description: string;
  username: string | null;
  created_at: string;
}

export interface DepartmentDatum {
  name: string;
  value: number;
}

export interface CommunityDatum {
  name: string;
  value: number;
}

export interface StrengthDatum {
  name: string;
  value: number;
}

const TOP_N_DEPARTMENTS = 6;
const TOP_N_COMMUNITIES = 6;

const bucketWithOther = (entries: [string, number][], topN: number): { name: string; value: number }[] => {
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN).reduce((sum, [, v]) => sum + v, 0);
  const result = top.map(([name, value]) => ({ name, value }));
  if (rest > 0) result.push({ name: 'Other', value: rest });
  return result;
};

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalConnections: 0,
    communities: 0,
    bridgeNodes: 0,
    averageDegree: 0,
    tierCounts: { High: 0, Medium: 0, Low: 0 },
  });
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [topInfluencer, setTopInfluencer] = useState<InfluencerResult | null>(null);
  const [topInfluencers, setTopInfluencers] = useState<InfluencerResult[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentDatum[]>([]);
  const [communityData, setCommunityData] = useState<CommunityDatum[]>([]);
  const [strengthData, setStrengthData] = useState<StrengthDatum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentStats, connectionStats, networkStats, recentActivity, influencersResp, communitiesResp] =
        await Promise.all([
          api.getStudentStats(),
          api.getConnectionStats(),
          api.getNetworkStats(),
          api.getRecentActivity(8),
          api.getTopInfluencers(10),
          api.getCommunities(),
        ]);

      const dist = networkStats.network_stats?.influence_distribution || {};
      setStats({
        totalStudents: studentStats.total_students ?? 0,
        totalConnections: connectionStats.total_connections ?? 0,
        communities: networkStats.network_stats?.community_count ?? 0,
        bridgeNodes: networkStats.network_stats?.bridge_node_count ?? 0,
        averageDegree: networkStats.network_stats?.average_degree_centrality ?? 0,
        tierCounts: { High: dist.High ?? 0, Medium: dist.Medium ?? 0, Low: dist.Low ?? 0 },
      });
      setActivity(recentActivity.activities || []);

      const influencers: InfluencerResult[] = influencersResp.influencers || [];
      setTopInfluencer(influencers[0] || null);
      setTopInfluencers(influencers);

      const byDepartment: Record<string, number> = studentStats.by_department || {};
      setDepartmentData(
        bucketWithOther(
          Object.entries(byDepartment).filter(([name]) => name && name !== 'null'),
          TOP_N_DEPARTMENTS
        )
      );

      const communities: Array<{ community_id: number; size: number }> = communitiesResp.communities || [];
      setCommunityData(
        bucketWithOther(
          communities.map((c) => [`Community ${c.community_id}`, c.size]),
          TOP_N_COMMUNITIES
        )
      );

      const byStrength: Record<string, number> = connectionStats.by_strength || {};
      setStrengthData(
        Object.entries(byStrength)
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([strength, count]) => ({ name: `${strength} ★`, value: count }))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return {
    stats,
    activity,
    topInfluencer,
    topInfluencers,
    departmentData,
    communityData,
    strengthData,
    loading,
    error,
    refresh: fetchAll,
  };
};
