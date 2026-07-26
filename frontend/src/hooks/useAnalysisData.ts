import { useEffect, useState } from 'react';
import api from '../services/api';
import { InfluencerResult } from '../types';

export interface NetworkOverview {
  totalNodes: number;
  totalEdges: number;
  density: number;
  avgDegree: number;
  avgBetweenness: number;
  avgCloseness: number;
  avgEigenvector: number;
  avgClustering: number;
  communities: number;
  largestCommunity: number;
  bridgeNodeCount: number;
}

export interface CommunityEntry {
  community_id: number;
  size: number;
  party_breakdown: { TESCON: number; TEIN: number };
}

export interface BridgeNodeEntry {
  student: { id: number; name: string; student_id: string; party: string | null; department: string | null };
  betweenness_centrality: number;
  community_id: number;
}

export const useAnalysisData = () => {
  const [overview, setOverview] = useState<NetworkOverview | null>(null);
  const [influencers, setInfluencers] = useState<InfluencerResult[]>([]);
  const [communities, setCommunities] = useState<CommunityEntry[]>([]);
  const [bridgeNodes, setBridgeNodes] = useState<BridgeNodeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsResp, influencersResp, communitiesResp, bridgeResp] = await Promise.all([
        api.getNetworkStats(),
        api.getTopInfluencers(50),
        api.getCommunities(),
        api.getBridgeNodes(),
      ]);

      const s = statsResp.network_stats;
      if (statsResp.success && s && s.total_students > 0) {
        setOverview({
          totalNodes: s.total_students,
          totalEdges: s.total_connections,
          density: s.network_density,
          avgDegree: s.average_degree_centrality,
          avgBetweenness: s.average_betweenness_centrality,
          avgCloseness: s.average_closeness_centrality,
          avgEigenvector: s.average_eigenvector_centrality ?? 0,
          avgClustering: s.average_clustering_coefficient,
          communities: s.community_count,
          largestCommunity: s.largest_community_size,
          bridgeNodeCount: s.bridge_node_count,
        });
      } else {
        setOverview(null);
      }

      setInfluencers(influencersResp.influencers || []);
      setCommunities(
        (communitiesResp.communities || []).slice().sort((a: CommunityEntry, b: CommunityEntry) => b.size - a.size)
      );
      setBridgeNodes(bridgeResp.bridge_nodes || []);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        setError(err.response?.data?.error || err.message || 'Failed to load analysis');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return { overview, influencers, communities, bridgeNodes, loading, error, refresh: fetchAll };
};
