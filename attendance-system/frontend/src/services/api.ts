import * as SecureStore from 'expo-secure-store';
import { ApiResponse, PaginatedResponse } from '@/types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiService {
  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const tokens = await SecureStore.getItemAsync('auth_tokens');
      return tokens ? JSON.parse(tokens).accessToken : null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers = await this.getHeaders();
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return { error: data.error || 'Request failed', code: data.code };
    }

    return { data: data.data || data };
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Auth
  async login(email: string, password: string) {
    return this.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/login', { email, password });
  }

  async register(data: any) {
    return this.post<{ user: any; accessToken: string; refreshToken: string }>('/auth/register', data);
  }

  async refreshToken(refreshToken: string) {
    return this.post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken });
  }

  async getMe() {
    return this.get<any>('/auth/me');
  }

  async logout() {
    return this.post('/auth/logout', {});
  }

  // QR Code
  async generateQR(sessionId: string) {
    return this.post<{ qrCode: string; token: string; expiresAt: string }>('/qr/generate', { sessionId });
  }

  async verifyQR(qrData: string, latitude?: number, longitude?: number) {
    return this.post<{ valid: boolean; session: any }>('/qr/verify', { qrData, latitude, longitude });
  }

  async getQRStatus(sessionId: string) {
    return this.get<{ session: any }>(`/qr/session/${sessionId}/status`);
  }

  // Attendance
  async markAttendance(sessionId: string, data: { faceDescriptor?: number[]; latitude?: number; longitude?: number; deviceInfo?: string }) {
    return this.post<{ attendance: any }>('/attendance/mark', { sessionId, ...data });
  }

  async manualAttendance(data: { sessionId: string; studentId: string; status: string; notes?: string }) {
    return this.post<{ attendance: any }>('/attendance/manual', data);
  }

  async getSessionAttendance(sessionId: string, params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.get<PaginatedResponse<any>>(`/attendance/session/${sessionId}?${query}`);
  }

  async getMyAttendance(params?: { startDate?: string; endDate?: string; subjectId?: string; status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.get<PaginatedResponse<any>>(`/attendance/my-records?${query}`);
  }

  async getClassAttendanceSummary(classId: string, params?: { subjectId?: string; startDate?: string; endDate?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.get<{ summary: any[] }>(`/attendance/class/${classId}/summary?${query}`);
  }

  // Sessions
  async createSession(data: any) {
    return this.post<any>('/sessions', data);
  }

  async getSessions(params?: any) {
    const query = new URLSearchParams(params).toString();
    return this.get<PaginatedResponse<any>>(`/sessions?${query}`);
  }

  async getUpcomingSessions() {
    return this.get<{ sessions: any[] }>('/sessions/upcoming');
  }

  async getSession(id: string) {
    return this.get<any>(`/sessions/${id}`);
  }

  async startSession(id: string, data: { locationLat?: number; locationLng?: number; allowedRadius?: number }) {
    return this.put<any>(`/sessions/${id}/start`, data);
  }

  async endSession(id: string) {
    return this.put<any>(`/sessions/${id}/end`, {});
  }

  async updateGeofence(id: string, data: { locationLat: number; locationLng: number; allowedRadius: number }) {
    return this.put<any>(`/sessions/${id}/geofence`, data);
  }

  async deleteSession(id: string) {
    return this.delete<any>(`/sessions/${id}`);
  }

  // Face
  async enrollFace(faceDescriptor: number[]) {
    return this.post<{ enrolled: boolean }>('/face/enroll', { faceDescriptor });
  }

  async getFaceStatus() {
    return this.get<{ enrolled: boolean; enrollmentDate?: string }>('/face/status');
  }

  async removeFace() {
    return this.delete('/face/enroll');
  }

  // Users
  async getUsers(params?: { role?: string; page?: number; limit?: number; search?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.get<PaginatedResponse<any>>(`/users?${query}`);
  }

  async getUser(id: string) {
    return this.get<any>(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.put<any>(`/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.delete(`/users/${id}`);
  }

  async getUserStats() {
    return this.get<any>('/users/stats/overview');
  }

  // Institutions
  async createInstitution(data: any) {
    return this.post<any>('/institutions', data);
  }

  async getInstitutions() {
    return this.get<{ institutions: any[] }>('/institutions');
  }

  async getInstitution(id: string) {
    return this.get<any>(`/institutions/${id}`);
  }

  async updateInstitution(id: string, data: any) {
    return this.put<any>(`/institutions/${id}`, data);
  }

  async deleteInstitution(id: string) {
    return this.delete(`/institutions/${id}`);
  }

  // Classes
  async createClass(data: any) {
    return this.post<any>('/classes', data);
  }

  async getClasses(params?: { institutionId?: string; branch?: string; semester?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.get<PaginatedResponse<any>>(`/classes?${query}`);
  }

  async getClass(id: string) {
    return this.get<any>(`/classes/${id}`);
  }

  async updateClass(id: string, data: any) {
    return this.put<any>(`/classes/${id}`, data);
  }

  async deleteClass(id: string) {
    return this.delete(`/classes/${id}`);
  }

  async addStudentsToClass(classId: string, studentIds: string[]) {
    return this.post(`/classes/${classId}/students`, { studentIds });
  }

  // Subjects
  async createSubject(data: any) {
    return this.post<any>('/subjects', data);
  }

  async getSubjects(params?: { institutionId?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return this.get<PaginatedResponse<any>>(`/subjects?${query}`);
  }

  async getSubject(id: string) {
    return this.get<any>(`/subjects/${id}`);
  }

  async assignSubject(data: { classId: string; subjectId: string; teacherId: string }) {
    return this.post<any>('/subjects/assign', data);
  }

  async unassignSubject(classId: string, subjectId: string) {
    return this.delete(`/subjects/assign/${classId}/${subjectId}`);
  }
}

export const api = new ApiService();