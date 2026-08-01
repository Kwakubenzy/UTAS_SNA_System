import axios, { AxiosInstance } from 'axios';
import { tokenStorage } from './tokenStorage';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ProfileResponse,
  User,
  UsersResponse,
  StudentFilters,
  StudentsResponse,
  StudentResponse,
  CreateStudentRequest,
  UpdateStudentRequest,
  DeleteResponse,
  ConnectionFilters,
  ConnectionsResponse,
  ConnectionResponse,
  CreateConnectionRequest,
  TopInfluencersResponse,
  RunAnalysisResponse,
  CampaignFilters,
  CampaignsResponse,
  CampaignResponse,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  constructor() {
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to attach token
    this.api.interceptors.request.use((config) => {
      const token = tokenStorage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = tokenStorage.getRefreshToken();
            const response = await axios.post(`${this.baseURL}/auth/refresh`, {}, {
              headers: { Authorization: `Bearer ${refreshToken}` },
            });

            const { access_token } = response.data.tokens;
            tokenStorage.setAccessToken(access_token);

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.api(originalRequest);
          } catch {
            tokenStorage.clear();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post('/auth/register', data);
    return response.data;
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post('/auth/login', data);
    return response.data;
  }

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    const response = await this.api.post('/auth/google', { credential });
    return response.data;
  }

  async logout(): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/auth/logout', {});
    return response.data;
  }

  async getProfile(): Promise<ProfileResponse> {
    const response = await this.api.get('/auth/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<ProfileResponse> {
    const response = await this.api.put('/auth/profile', data);
    return response.data;
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword });
    return response.data;
  }

  async deleteProfile(password: string): Promise<{ success: boolean; message: string }> {
    const response = await this.api.delete('/auth/profile', {
      data: { password },
    });
    return response.data;
  }

  // Admin endpoints
  async getAllUsers(skip = 0, limit = 50): Promise<UsersResponse> {
    const response = await this.api.get('/auth/users', { params: { skip, limit } });
    return response.data;
  }

  async getUser(userId: number): Promise<ProfileResponse> {
    const response = await this.api.get(`/auth/users/${userId}`);
    return response.data;
  }

  async assignRole(userId: number, role: string): Promise<ProfileResponse> {
    const response = await this.api.put(`/auth/users/${userId}/role`, { role });
    return response.data;
  }

  async setUserStatus(userId: number, isActive: boolean): Promise<ProfileResponse> {
    const response = await this.api.put(`/auth/users/${userId}/status`, { is_active: isActive });
    return response.data;
  }

  // Students endpoints
  async getStudents(filters?: StudentFilters): Promise<StudentsResponse> {
    const response = await this.api.get('/students', { params: filters });
    return response.data;
  }

  async getStudent(studentId: number): Promise<StudentResponse> {
    const response = await this.api.get(`/students/${studentId}`);
    return response.data;
  }

  async createStudent(data: CreateStudentRequest): Promise<StudentResponse> {
    const response = await this.api.post('/students', data);
    return response.data;
  }

  async updateStudent(studentId: number, data: UpdateStudentRequest): Promise<StudentResponse> {
    const response = await this.api.put(`/students/${studentId}`, data);
    return response.data;
  }

  async deleteStudent(studentId: number): Promise<DeleteResponse> {
    const response = await this.api.delete(`/students/${studentId}`);
    return response.data;
  }

  async getStudentStats(): Promise<any> {
    const response = await this.api.get('/students/stats/summary');
    return response.data;
  }

  // Connections endpoints
  async getConnections(filters?: ConnectionFilters): Promise<ConnectionsResponse> {
    const response = await this.api.get('/connections', { params: filters });
    return response.data;
  }

  async getConnection(connectionId: number): Promise<ConnectionResponse> {
    const response = await this.api.get(`/connections/${connectionId}`);
    return response.data;
  }

  async createConnection(data: CreateConnectionRequest): Promise<ConnectionResponse> {
    const response = await this.api.post('/connections', data);
    return response.data;
  }

  async deleteConnection(connectionId: number): Promise<DeleteResponse> {
    const response = await this.api.delete(`/connections/${connectionId}`);
    return response.data;
  }

  async getConnectionStats(): Promise<any> {
    const response = await this.api.get('/connections/stats/summary');
    return response.data;
  }

  // Analysis endpoints
  async runAnalysis(): Promise<RunAnalysisResponse> {
    const response = await this.api.post('/analysis/run-analysis', {});
    return response.data;
  }

  async getNetworkStats(): Promise<any> {
    const response = await this.api.get('/analysis/network-stats');
    return response.data;
  }

  async getExpertAdvice(): Promise<any> {
    const response = await this.api.get('/analysis/expert-advice');
    return response.data;
  }

  async getGraphData(): Promise<any> {
    const response = await this.api.get('/analysis/graph-data');
    return response.data;
  }

  async downloadReport(): Promise<Blob> {
    const response = await this.api.get('/analysis/report', { responseType: 'blob' });
    return response.data;
  }

  async getTopInfluencers(limit = 10): Promise<TopInfluencersResponse> {
    const response = await this.api.get('/analysis/top-influencers', { params: { limit } });
    return response.data;
  }

  async getCommunities(): Promise<any> {
    const response = await this.api.get('/analysis/communities');
    return response.data;
  }

  async getCentrality(metricType: string, limit = 20): Promise<any> {
    const response = await this.api.get(`/analysis/centrality/${metricType}`, { params: { limit } });
    return response.data;
  }

  async getBridgeNodes(): Promise<any> {
    const response = await this.api.get('/analysis/bridge-nodes');
    return response.data;
  }

  async importCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    // Leave Content-Type unset so the browser generates the multipart
    // boundary itself -- explicitly setting it to 'multipart/form-data'
    // (without a boundary) makes the server unable to parse the upload.
    const response = await this.api.post('/analysis/import-csv', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  }

  async importExcel(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await this.api.post('/analysis/import-excel', formData, {
      headers: { 'Content-Type': undefined },
    });
    return response.data;
  }

  // Campaigns endpoints
  async getCampaigns(filters?: CampaignFilters): Promise<CampaignsResponse> {
    const response = await this.api.get('/campaigns', { params: filters });
    return response.data;
  }

  async getCampaign(campaignId: number): Promise<CampaignResponse> {
    const response = await this.api.get(`/campaigns/${campaignId}`);
    return response.data;
  }

  async createCampaign(data: CreateCampaignRequest): Promise<CampaignResponse> {
    const response = await this.api.post('/campaigns', data);
    return response.data;
  }

  async updateCampaign(campaignId: number, data: UpdateCampaignRequest): Promise<CampaignResponse> {
    const response = await this.api.put(`/campaigns/${campaignId}`, data);
    return response.data;
  }

  async deleteCampaign(campaignId: number): Promise<DeleteResponse> {
    const response = await this.api.delete(`/campaigns/${campaignId}`);
    return response.data;
  }

  async getCampaignRecommendations(campaignId: number, limit = 10): Promise<any> {
    const response = await this.api.get(`/campaigns/${campaignId}/recommendations`, { params: { limit } });
    return response.data;
  }

  // Activity endpoints
  async getRecentActivity(limit = 10): Promise<any> {
    const response = await this.api.get('/activity/recent', { params: { limit } });
    return response.data;
  }
}

export default new ApiService();
