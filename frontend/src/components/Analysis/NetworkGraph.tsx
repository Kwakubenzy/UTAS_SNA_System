import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface GraphNode {
  id: number;
  name: string;
  student_id: string;
  party: string | null;
  college: string | null;
  department: string | null;
  year: number | null;
  tribe: string | null;
  religion: string | null;
  hometown: string | null;
  district: string | null;
  regional_capital: string | null;
  community_id: number;
  influence_tier: string;
  degree_centrality: number;
  pagerank_score: number;
  bridge_node: boolean;
  x?: number;
  y?: number;
}

/** Attribute-based grouping modes -- each colors/legends the graph by a
 *  shared student attribute, so students from the same hometown, tribe,
 *  etc. visually cluster within the one main network rather than needing
 *  separate graphs per attribute. */
type AttributeMode = 'department' | 'tribe' | 'religion' | 'hometown' | 'district' | 'regional_capital';
type ColorMode = 'party' | 'community' | AttributeMode;

const ATTRIBUTE_LABELS: Record<AttributeMode, string> = {
  department: 'Department',
  tribe: 'Tribe',
  religion: 'Religion',
  hometown: 'Hometown',
  district: 'District',
  regional_capital: 'Regional Capital',
};

/** Free-text survey answers vary in casing/whitespace ("accra", "Accra ",
 *  "ACCRA") even when they mean the same value -- collapse those together
 *  for grouping/display. Department gets its own, more involved
 *  normalization server-side (see backend/app/utils/normalize.py), since
 *  it also has to reconcile degree-prefix variants ("Bsc", "B.Ed", none at
 *  all); this one just handles plain casing/whitespace for the rest. */
const normalizeLabel = (raw: string | null): string => {
  if (!raw || !raw.trim()) return 'Unspecified';
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  return collapsed.replace(/\b\w/g, (c) => c.toUpperCase());
};

const attributeValue = (node: GraphNode, mode: AttributeMode): string => normalizeLabel(node[mode]);

interface GraphLink {
  source: number;
  target: number;
  strength: number;
  relationship_type: string | null;
}

const PARTY_COLORS: Record<string, string> = {
  TESCON: '#2563EB',
  TEIN: '#D97706',
};
const NEUTRAL_COLOR = '#94a3b8';
const BRIDGE_RING_COLOR = '#0f172a';

// Fixed categorical order (dataviz skill's validated 8-hue theme) -- never cycled,
// so a given community/relationship type keeps the same color as the data changes.
const CATEGORICAL_LIGHT = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7', '#e34948'];
const CATEGORICAL_DARK = ['#3987e5', '#008300', '#d55181', '#c98500', '#199e70', '#d95926', '#9085e9', '#e66767'];

const partyColor = (node: GraphNode) => (node.party ? PARTY_COLORS[node.party] || NEUTRAL_COLOR : NEUTRAL_COLOR);

/** Assigns each distinct value a stable slot index (0-7), giving real colors to
 *  the most frequent values first so the biggest groups stand out rather than
 *  whichever values happen to sort first alphabetically; anything past 8
 *  distinct values folds into "Other" (-1) rather than generating a new hue. */
const buildColorMap = <T extends string | number>(values: T[], fixedOrder: T[] = []): Map<T, number> => {
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const distinct = Array.from(counts.keys());
  const rest = distinct
    .filter((v) => !fixedOrder.includes(v))
    .sort((a, b) => {
      const byCount = (counts.get(b) || 0) - (counts.get(a) || 0);
      if (byCount !== 0) return byCount;
      return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b));
    });
  const ordered = [...fixedOrder.filter((v) => distinct.includes(v)), ...rest];
  const map = new Map<T, number>();
  ordered.forEach((v, i) => map.set(v, i < 8 ? i : -1));
  return map;
};

const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

interface NetworkGraphProps {
  height?: number;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ height = 620 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('department');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [partyFilter, setPartyFilter] = useState('all');
  const [communityFilter, setCommunityFilter] = useState('all');
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const fetchGraph = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.getGraphData();
        if (response.success) {
          setGraphData({ nodes: response.nodes, links: response.links });
        } else {
          setError(response.error || 'Failed to load graph data');
        }
      } catch (err: any) {
        setError(err.response?.data?.error || err.message || 'Failed to load graph data');
      } finally {
        setLoading(false);
      }
    };
    fetchGraph();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const palette = resolvedTheme === 'dark' ? CATEGORICAL_DARK : CATEGORICAL_LIGHT;

  const filterOptions = useMemo(() => {
    const nodes = graphData?.nodes || [];
    const departments = Array.from(new Set(nodes.map((n) => n.department).filter(Boolean))) as string[];
    const years = Array.from(new Set(nodes.map((n) => n.year).filter((y): y is number => y != null))).sort((a, b) => a - b);
    const communityIds = Array.from(new Set(nodes.map((n) => n.community_id).filter((id) => id >= 0))).sort((a, b) => a - b);
    return {
      departments: departments.sort((a, b) => a.localeCompare(b)),
      years,
      communityIds,
    };
  }, [graphData]);

  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;
    const nodes = graphData.nodes.filter((n) => {
      if (departmentFilter !== 'all' && n.department !== departmentFilter) return false;
      if (yearFilter !== 'all' && String(n.year) !== yearFilter) return false;
      if (partyFilter !== 'all' && (n.party || 'none') !== partyFilter) return false;
      if (communityFilter !== 'all' && String(n.community_id) !== communityFilter) return false;
      return true;
    });
    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((l) => nodeIds.has(l.source) && nodeIds.has(l.target));
    return { nodes, links };
  }, [graphData, departmentFilter, yearFilter, partyFilter, communityFilter]);

  const communityColorMap = useMemo(() => {
    const ids = (graphData?.nodes || []).map((n) => n.community_id).filter((id) => id >= 0);
    return buildColorMap(ids);
  }, [graphData]);

  /** One shared color map for whichever attribute mode is currently active
   *  (department/tribe/religion/hometown/district/regional_capital) --
   *  recomputed only when the graph data or the selected attribute
   *  changes, rather than keeping six near-identical maps around. */
  const attributeColorMap = useMemo(() => {
    if (colorMode === 'party' || colorMode === 'community') return new Map<string, number>();
    const values = (graphData?.nodes || []).map((n) => attributeValue(n, colorMode));
    return buildColorMap(values);
  }, [graphData, colorMode]);

  const communityColor = useCallback(
    (node: GraphNode) => {
      if (node.community_id < 0) return NEUTRAL_COLOR;
      const idx = communityColorMap.get(node.community_id);
      return idx !== undefined && idx >= 0 ? palette[idx] : NEUTRAL_COLOR;
    },
    [communityColorMap, palette]
  );

  const attributeColor = useCallback(
    (node: GraphNode, mode: AttributeMode) => {
      const idx = attributeColorMap.get(attributeValue(node, mode));
      return idx !== undefined && idx >= 0 ? palette[idx] : NEUTRAL_COLOR;
    },
    [attributeColorMap, palette]
  );

  const nodeColor = useCallback(
    (node: GraphNode) => {
      if (colorMode === 'community') return communityColor(node);
      if (colorMode === 'party') return partyColor(node);
      return attributeColor(node, colorMode);
    },
    [colorMode, communityColor, attributeColor]
  );

  const communityLegend = useMemo(() => {
    const entries = Array.from(communityColorMap.entries())
      .filter(([, idx]) => idx >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([id, idx]) => ({ label: `Community ${id}`, color: palette[idx] }));
    const hasOther = Array.from(communityColorMap.values()).some((idx) => idx === -1);
    if (hasOther) entries.push({ label: 'Other communities', color: NEUTRAL_COLOR });
    return entries;
  }, [communityColorMap, palette]);

  const attributeLegend = useMemo(() => {
    if (colorMode === 'party' || colorMode === 'community') return [];
    const entries = Array.from(attributeColorMap.entries())
      .filter(([, idx]) => idx >= 0)
      .sort((a, b) => a[1] - b[1])
      .map(([name, idx]) => ({ label: name, color: palette[idx] }));
    const hasOther = Array.from(attributeColorMap.values()).some((idx) => idx === -1);
    if (hasOther) entries.push({ label: `Other (${ATTRIBUTE_LABELS[colorMode].toLowerCase()})`, color: NEUTRAL_COLOR });
    return entries;
  }, [attributeColorMap, palette, colorMode]);

  /** Edges take the colour of their source node, so a connection visually
   *  belongs to whichever cluster is currently being highlighted (party,
   *  community, or an attribute) instead of a fixed hue. */
  const nodeColorById = useMemo(() => {
    const map = new Map<number, string>();
    (graphData?.nodes || []).forEach((n) => map.set(n.id, nodeColor(n)));
    return map;
  }, [graphData, nodeColor]);

  const maxPagerank = useMemo(
    () => Math.max(...(graphData?.nodes.map((n) => n.pagerank_score) || [0]), 1e-9),
    [graphData]
  );

  const nodeRadius = useCallback(
    (node: GraphNode) => 3 + (node.pagerank_score / maxPagerank) * 11,
    [maxPagerank]
  );

  const nodeLabel = useCallback(
    (node: any) => {
      const n = node as GraphNode;
      return `<div style="font-size:12px;padding:4px 6px;">
      <strong>${n.name}</strong><br/>
      ${n.department || 'No department'} &middot; ${n.party || 'No party'}<br/>
      PageRank ${n.pagerank_score.toFixed(4)} &middot; Community ${n.community_id >= 0 ? n.community_id : '-'}
      ${n.bridge_node ? '<br/><strong>Bridge node</strong>' : ''}
    </div>`;
    },
    []
  );

  const linkLabel = useCallback((link: any) => {
    const l = link as GraphLink;
    return `<div style="font-size:12px;padding:4px 6px;">${l.relationship_type || 'Unspecified'} &middot; strength ${l.strength}</div>`;
  }, []);

  const linkColorFn = useCallback(
    (link: any) => {
      const source = (link as any).source;
      const sourceId = typeof source === 'object' && source !== null ? source.id : source;
      return hexToRgba(nodeColorById.get(sourceId) || NEUTRAL_COLOR, 0.55);
    },
    [nodeColorById]
  );

  const linkWidthFn = useCallback((link: any) => {
    const strength = Math.min(Math.max((link as GraphLink).strength || 1, 1), 5);
    return 1 + ((strength - 1) / 4) * 2.5;
  }, []);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      const n = node as GraphNode;
      const r = nodeRadius(n);
      ctx.beginPath();
      ctx.arc(n.x || 0, n.y || 0, r, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor(n);
      ctx.fill();
      if (n.bridge_node) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = BRIDGE_RING_COLOR;
        ctx.stroke();
      }
    },
    [nodeRadius, nodeColor]
  );

  const paintPointerArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const n = node as GraphNode;
      ctx.beginPath();
      ctx.arc(n.x || 0, n.y || 0, nodeRadius(n) + 2, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [nodeRadius]
  );

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center gap-2 text-sm text-slate-400 dark:text-navy-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading network graph...
      </div>
    );
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-500 dark:bg-red-500/10 dark:text-red-400">{error}</div>;
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-slate-400 dark:text-navy-400">
        No network data yet &mdash; import students and connections first.
      </div>
    );
  }

  const selectClasses =
    'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-navy-700 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100';

  return (
    <div>
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 dark:border-navy-700 dark:bg-navy-900/40">
        <div className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-navy-400">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className={selectClasses}>
            <option value="all">All departments</option>
            {filterOptions.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className={selectClasses}>
            <option value="all">All years</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={y}>
                Year {y}
              </option>
            ))}
          </select>
          <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className={selectClasses}>
            <option value="all">All affiliations</option>
            <option value="TESCON">TESCON</option>
            <option value="TEIN">TEIN</option>
            <option value="none">No party</option>
          </select>
          <select value={communityFilter} onChange={(e) => setCommunityFilter(e.target.value)} className={selectClasses}>
            <option value="all">All communities</option>
            {filterOptions.communityIds.map((id) => (
              <option key={id} value={id}>
                Community {id}
              </option>
            ))}
          </select>
          {(departmentFilter !== 'all' || yearFilter !== 'all' || partyFilter !== 'all' || communityFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setDepartmentFilter('all');
                setYearFilter('all');
                setPartyFilter('all');
                setCommunityFilter('all');
              }}
              className="text-xs font-medium text-[#1E3A8A] hover:text-[#17306F] dark:text-blue-400"
            >
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400 dark:text-navy-500">
            Showing {filteredGraphData?.nodes.length ?? 0} of {graphData.nodes.length} students
          </span>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-navy-300">
          {colorMode === 'party' && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PARTY_COLORS.TESCON }} /> TESCON
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PARTY_COLORS.TEIN }} /> TEIN
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: NEUTRAL_COLOR }} /> No party
              </span>
            </>
          )}
          {colorMode === 'community' &&
            communityLegend.map((entry) => (
              <span key={entry.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} /> {entry.label}
              </span>
            ))}
          {colorMode !== 'party' &&
            colorMode !== 'community' &&
            attributeLegend.map((entry) => (
              <span key={entry.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} /> {entry.label}
              </span>
            ))}
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border-2 border-navy-900 dark:border-white" /> Bridge node
          </span>
        </div>

        <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-navy-300">
          Color by
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMode)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-navy-700 focus:border-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-100"
          >
            <option value="party">Political party</option>
            <option value="community">Detected community</option>
            {(Object.keys(ATTRIBUTE_LABELS) as AttributeMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {ATTRIBUTE_LABELS[mode]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-navy-700 dark:text-navy-300">
        <span>
          Edge color matches the connection's source student &middot; edge thickness = friendship strength &middot; node
          size = PageRank &middot; drag to reposition, scroll to zoom
        </span>
      </div>

      <div
        ref={containerRef}
        className="overflow-hidden rounded-xl border border-slate-200 dark:border-navy-700"
      >
        {filteredGraphData && filteredGraphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center text-sm text-slate-400 dark:text-navy-400" style={{ height }}>
            No students match the selected filters.
          </div>
        ) : (
        <ForceGraph2D
          graphData={filteredGraphData as any}
          width={width}
          height={height}
          nodeId="id"
          nodeLabel={nodeLabel}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          linkLabel={linkLabel}
          linkColor={linkColorFn}
          linkWidth={linkWidthFn}
          backgroundColor="transparent"
          cooldownTicks={100}
          onNodeClick={(n: any) => setSelectedNode(n as GraphNode)}
        />
        )}
      </div>
      {selectedNode && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-navy-700 dark:bg-navy-900">
          <p className="font-semibold text-navy-900 dark:text-white">
            {selectedNode.name} <span className="font-normal text-slate-400">({selectedNode.student_id})</span>
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-navy-300">
            {selectedNode.department || 'No department'} &middot; {selectedNode.party || 'No party'} &middot; Community{' '}
            {selectedNode.community_id >= 0 ? selectedNode.community_id : 'none'} &middot; {selectedNode.influence_tier}{' '}
            influence &middot; PageRank {selectedNode.pagerank_score.toFixed(4)}
            {selectedNode.bridge_node && ' · Bridge node'}
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-navy-400">
            {[selectedNode.tribe, selectedNode.religion, selectedNode.hometown, selectedNode.district, selectedNode.regional_capital]
              .filter(Boolean)
              .join(' · ') || 'No tribe/religion/hometown data'}
          </p>
        </div>
      )}
    </div>
  );
};
