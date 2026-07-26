export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  tribe?: string;
  party?: string;
  college?: string;
  department?: string;
  year?: number;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export type Party = 'TESCON' | 'TEIN';

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  tribe?: string;
  party?: string;
  college?: string;
  department?: string;
  year?: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  tokens?: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface ProfileResponse {
  success: boolean;
  user?: User;
  message?: string;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  message?: string;
  error?: string;
}

export interface UsersResponse extends ApiResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface Student {
  id: number;
  student_id: string;
  name: string;
  tribe?: string | null;
  gender?: string | null;
  party: Party | null;
  college?: string | null;
  department?: string | null;
  year?: number | null;
  religion?: string | null;
  hometown?: string | null;
  district?: string | null;
  regional_capital?: string | null;
  email?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentFilters {
  department?: string;
  college?: string;
  party?: Party;
  year?: number;
}

export interface CreateStudentRequest {
  student_id: string;
  name: string;
  party: Party;
  college: string;
  department: string;
  year: number;
  tribe?: string;
  email?: string;
  phone?: string;
}

export type UpdateStudentRequest = Partial<CreateStudentRequest>;

export interface StudentsResponse extends ApiResponse {
  count: number;
  students: Student[];
}

export interface StudentResponse extends ApiResponse {
  student?: Student;
}

export interface DeleteResponse extends ApiResponse {
  message: string;
}

export interface Connection {
  id: number;
  from_student_id: number;
  to_student_id: number;
  strength: number;
  relationship_type?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionListItem {
  connection: Connection;
  from_student: Student;
  to_student: Student;
}

export interface ConnectionFilters {
  from_id?: number;
  to_id?: number;
}

export interface CreateConnectionRequest {
  from_student_id: number;
  to_student_id: number;
  strength?: number;
  relationship_type?: string;
}

export interface ConnectionsResponse extends ApiResponse {
  count: number;
  connections: ConnectionListItem[];
}

export interface ConnectionResponse extends ApiResponse {
  connection?: Connection;
  from_student?: Student;
  to_student?: Student;
}

export type CampaignStatus = 'planning' | 'active' | 'completed';

export interface Campaign {
  id: number;
  campaign_id: string;
  campaign_name: string;
  description?: string | null;
  manager_id: number;
  target_party?: Party | null;
  start_date: string;
  end_date?: string | null;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  manager_id?: number;
}

export interface CreateCampaignRequest {
  campaign_id: string;
  campaign_name: string;
  manager_id: number;
  description?: string;
  target_party?: Party;
  status?: CampaignStatus;
}

export type UpdateCampaignRequest = Partial<Omit<CreateCampaignRequest, 'campaign_id' | 'manager_id'>>;

export interface CampaignsResponse extends ApiResponse {
  count: number;
  campaigns: Campaign[];
}

export interface CampaignResponse extends ApiResponse {
  campaign?: Campaign;
  manager?: Student | null;
}

export interface NetworkMetric {
  id: number;
  student_id: number;
  degree_centrality: number;
  betweenness_centrality: number;
  closeness_centrality: number;
  eigenvector_centrality?: number;
  pagerank_score: number;
  clustering_coefficient: number;
  community_id: number;
  influence_tier: 'High' | 'Medium' | 'Low';
  bridge_node: boolean;
  created_at: string;
  updated_at: string;
}

export interface InfluencerResult {
  student: Student;
  metrics: NetworkMetric;
}

export interface TopInfluencersResponse extends ApiResponse {
  count: number;
  influencers: InfluencerResult[];
}

export interface RunAnalysisResponse extends ApiResponse {
  metrics?: {
    nodes: number;
    edges: number;
    metrics_calculated: string[];
  };
}
