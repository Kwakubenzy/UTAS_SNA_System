import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Target, Plus, Trash2, Eye, Pencil } from 'lucide-react';
import api from '../services/api';
import { useStudents } from '../hooks/useStudents';
import { Campaign, CampaignStatus, CreateCampaignRequest, UpdateCampaignRequest, InfluencerResult, Party } from '../types';
import { usePagination } from '../hooks/usePagination';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { Badge, PartyBadge } from '../components/ui/Badge';
import { Select, Input, Textarea, FieldWrapper } from '../components/ui/FormField';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

interface CampaignRecommendations {
  campaign: Campaign;
  target_party: Party | null;
  top_influencers: InfluencerResult[];
  bridge_nodes: InfluencerResult[];
}

const STATUS_TONE: Record<CampaignStatus, 'emerald' | 'amber' | 'slate'> = {
  active: 'emerald',
  planning: 'amber',
  completed: 'slate',
};

const emptyCampaignForm = {
  campaign_id: '',
  campaign_name: '',
  manager_id: '',
  description: '',
  target_party: '',
  status: 'planning' as CampaignStatus,
};

export const Campaigns: React.FC = () => {
  const { students } = useStudents();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | CampaignStatus>('all');
  const [showModal, setShowModal] = useState(false);
  const [newCampaign, setNewCampaign] = useState(emptyCampaignForm);
  const [saving, setSaving] = useState(false);

  const [viewingCampaignId, setViewingCampaignId] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<CampaignRecommendations | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState<UpdateCampaignRequest>({});
  const [editSaving, setEditSaving] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await api.getCampaigns();
      if (response.success) {
        setCampaigns(response.campaigns || []);
      } else {
        toast.error(response.error || 'Failed to load campaigns');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const filteredCampaigns = filterStatus === 'all' ? campaigns : campaigns.filter((c) => c.status === filterStatus);
  const { page, setPage, pageCount, pageItems, totalItems, pageSize } = usePagination(filteredCampaigns, 9);

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    const managerId = Number.parseInt(newCampaign.manager_id, 10);
    if (!Number.isInteger(managerId) || managerId < 1) {
      toast.error('Select a campaign manager');
      return;
    }

    const payload: CreateCampaignRequest = {
      campaign_id: newCampaign.campaign_id.trim() || `CAMP-${Date.now()}`,
      campaign_name: newCampaign.campaign_name.trim(),
      manager_id: managerId,
      description: newCampaign.description.trim() || undefined,
      target_party: newCampaign.target_party ? (newCampaign.target_party as Party) : undefined,
      status: newCampaign.status,
    };

    setSaving(true);
    try {
      const response = await api.createCampaign(payload);
      if (response.success && response.campaign) {
        setCampaigns((prev) => [...prev, response.campaign as Campaign]);
        setNewCampaign(emptyCampaignForm);
        setShowModal(false);
        toast.success('Campaign created');
      } else {
        toast.error(response.error || 'Failed to create campaign');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to create campaign');
    } finally {
      setSaving(false);
    }
  };

  const handleViewRecommendations = async (campaign: Campaign) => {
    setViewingCampaignId(campaign.id);
    setRecommendationsLoading(true);
    setRecommendations(null);
    try {
      const response = await api.getCampaignRecommendations(campaign.id);
      if (response.success) {
        setRecommendations({
          campaign: response.campaign,
          target_party: response.target_party,
          top_influencers: response.top_influencers || [],
          bridge_nodes: response.bridge_nodes || [],
        });
      } else {
        toast.error(response.error || 'Failed to load recommendations');
        setViewingCampaignId(null);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to load recommendations');
      setViewingCampaignId(null);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const openEditModal = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      campaign_name: campaign.campaign_name,
      description: campaign.description || '',
      target_party: campaign.target_party || undefined,
      status: campaign.status,
    });
  };

  const handleUpdateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    setEditSaving(true);
    try {
      const response = await api.updateCampaign(editingCampaign.id, editForm);
      if (response.success && response.campaign) {
        const updated = response.campaign;
        setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        setEditingCampaign(null);
        toast.success('Campaign updated');
      } else {
        toast.error(response.error || 'Failed to update campaign');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to update campaign');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (campaignId: number) => {
    if (!window.confirm('Delete this campaign? This cannot be undone.')) return;
    try {
      const response = await api.deleteCampaign(campaignId);
      if (response.success) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
        toast.success('Campaign deleted');
      } else {
        toast.error(response.error || 'Failed to delete campaign');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to delete campaign');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy-900 dark:text-white">Campaigns</h1>
            <p className="text-sm text-slate-500 dark:text-navy-300">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | CampaignStatus)} className="w-40">
            <option value="all">All campaigns</option>
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </Select>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setNewCampaign(emptyCampaignForm); setShowModal(true); }}>
            Create Campaign
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="mb-3 h-5 w-2/3" />
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No campaigns found"
          description="Create a campaign to start planning targeted outreach."
          action={
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
              Create Campaign
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pageItems.map((campaign) => (
              <Card key={campaign.id} className="flex flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-navy-900 dark:text-white">{campaign.campaign_name}</h3>
                  <Badge tone={STATUS_TONE[campaign.status]}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </Badge>
                </div>
                <p className="mb-3 flex-1 whitespace-pre-line text-sm text-slate-500 dark:text-navy-300">
                  {campaign.description || 'No description'}
                </p>
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400 dark:text-navy-400">
                  {campaign.target_party && <PartyBadge party={campaign.target_party} />}
                  <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-navy-700">
                  <Button variant="secondary" size="sm" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => handleViewRecommendations(campaign)}>
                    View
                  </Button>
                  <Button variant="secondary" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEditModal(campaign)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => handleDelete(campaign.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} totalItems={totalItems} pageSize={pageSize} onPageChange={setPage} />
        </>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Campaign">
        <form onSubmit={handleCreateCampaign}>
          <FieldWrapper label="Campaign name" htmlFor="campaign_name" required>
            <Input
              id="campaign_name"
              value={newCampaign.campaign_name}
              onChange={(e) => setNewCampaign({ ...newCampaign, campaign_name: e.target.value })}
              required
            />
          </FieldWrapper>

          <FieldWrapper label="Campaign manager" htmlFor="manager_id" required>
            <Select
              id="manager_id"
              value={newCampaign.manager_id}
              onChange={(e) => setNewCampaign({ ...newCampaign, manager_id: e.target.value })}
              required
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_id})
                </option>
              ))}
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Description" htmlFor="description">
            <Textarea
              id="description"
              rows={6}
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
            />
          </FieldWrapper>

          <FieldWrapper label="Target party" htmlFor="target_party">
            <Select
              id="target_party"
              value={newCampaign.target_party}
              onChange={(e) => setNewCampaign({ ...newCampaign, target_party: e.target.value })}
            >
              <option value="">Select party</option>
              <option value="TESCON">TESCON</option>
              <option value="TEIN">TEIN</option>
            </Select>
          </FieldWrapper>

          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={saving} className="flex-1">
              Create Campaign
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={editingCampaign !== null} onClose={() => setEditingCampaign(null)} title="Edit Campaign">
        <form onSubmit={handleUpdateCampaign}>
          <FieldWrapper label="Campaign name" htmlFor="edit_campaign_name" required>
            <Input
              id="edit_campaign_name"
              value={editForm.campaign_name || ''}
              onChange={(e) => setEditForm({ ...editForm, campaign_name: e.target.value })}
              required
            />
          </FieldWrapper>

          <FieldWrapper label="Description" htmlFor="edit_description">
            <Textarea
              id="edit_description"
              rows={6}
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
          </FieldWrapper>

          <FieldWrapper label="Target party" htmlFor="edit_target_party">
            <Select
              id="edit_target_party"
              value={editForm.target_party || ''}
              onChange={(e) => setEditForm({ ...editForm, target_party: (e.target.value as Party) || undefined })}
            >
              <option value="">No target party</option>
              <option value="TESCON">TESCON</option>
              <option value="TEIN">TEIN</option>
            </Select>
          </FieldWrapper>

          <FieldWrapper label="Status" htmlFor="edit_status">
            <Select
              id="edit_status"
              value={editForm.status || 'planning'}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as CampaignStatus })}
            >
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </Select>
          </FieldWrapper>

          <div className="mt-2 flex gap-3">
            <Button type="submit" loading={editSaving} className="flex-1">
              Save Changes
            </Button>
            <Button type="button" variant="secondary" onClick={() => setEditingCampaign(null)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={viewingCampaignId !== null}
        onClose={() => setViewingCampaignId(null)}
        title="Outreach Recommendations"
        widthClassName="max-w-2xl"
      >
        {recommendationsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : recommendations ? (
          <>
            <p className="mb-5 text-sm text-slate-500 dark:text-navy-300">
              {recommendations.target_party
                ? `Filtered to ${recommendations.target_party} students, ranked by influence.`
                : 'This campaign has no target party set, so recommendations span all students.'}
            </p>

            <h4 className="mb-2 text-sm font-semibold text-navy-900 dark:text-white">Top influencers to reach</h4>
            {recommendations.top_influencers.length === 0 ? (
              <p className="mb-5 text-sm text-slate-400 dark:text-navy-400">
                No influencers found. Run analysis on the Analysis page first.
              </p>
            ) : (
              <div className="mb-5 overflow-hidden rounded-xl border border-slate-100 dark:border-navy-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-navy-900 dark:text-navy-400">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Tier</th>
                      <th className="px-3 py-2 font-medium">Degree</th>
                      <th className="px-3 py-2 font-medium">Party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.top_influencers.map((r) => (
                      <tr key={r.student.id} className="border-t border-slate-100 dark:border-navy-700">
                        <td className="px-3 py-2 font-medium text-navy-900 dark:text-white">{r.student.name}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-navy-300">{r.metrics.influence_tier}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-500 dark:text-navy-300">{r.metrics.degree_centrality.toFixed(3)}</td>
                        <td className="px-3 py-2"><PartyBadge party={r.student.party} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h4 className="mb-2 text-sm font-semibold text-navy-900 dark:text-white">Bridge nodes (cross-community reach)</h4>
            {recommendations.bridge_nodes.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-navy-400">No bridge nodes found for this filter.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-navy-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-left text-xs uppercase text-slate-400 dark:bg-navy-900 dark:text-navy-400">
                      <th className="px-3 py-2 font-medium">Name</th>
                      <th className="px-3 py-2 font-medium">Betweenness</th>
                      <th className="px-3 py-2 font-medium">Community</th>
                      <th className="px-3 py-2 font-medium">Party</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.bridge_nodes.map((r) => (
                      <tr key={r.student.id} className="border-t border-slate-100 dark:border-navy-700">
                        <td className="px-3 py-2 font-medium text-navy-900 dark:text-white">{r.student.name}</td>
                        <td className="px-3 py-2 tabular-nums text-slate-500 dark:text-navy-300">{r.metrics.betweenness_centrality.toFixed(4)}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-navy-300">{r.metrics.community_id}</td>
                        <td className="px-3 py-2"><PartyBadge party={r.student.party} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </Modal>
    </motion.div>
  );
};
