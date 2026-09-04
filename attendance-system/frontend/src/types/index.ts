export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'STUDENT' | 'TEACHER' | 'PLATFORM_OWNER';
  phone?: string;
  avatarUrl?: string;
  faceDescriptor?: string;
  studentProfile?: StudentProfile;
  teacherProfile?: TeacherProfile;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentId: string;
  branch: string;
  classId: string;
  semester: number;
  section?: string;
  enrollmentYear: number;
  parentPhone?: string;
  address?: string;
}

export interface TeacherProfile {
  id: string;
  userId: string;
  employeeId: string;
  department: string;
  designation: string;
  subjects: string[];
  institutionId: string;
  institution?: Institution;
}

export interface Institution {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  country: string;
}

export interface Class {
  id: string;
  name: string;
  branch: string;
  semester: number;
  section: string;
  academicYear: string;
  institutionId: string;
  classTeacherId?: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  credits: number;
  institutionId: string;
}

export interface SubjectClassMapping {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  class?: Class;
  subject?: Subject;
  teacher?: TeacherProfile;
}

export interface ClassSession {
  id: string;
  subjectClassMappingId: string;
  teacherId: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  qrCodeData?: string;
  qrExpiresAt?: string;
  locationLat?: number;
  locationLng?: number;
  allowedRadius?: number;
  requireFaceVerify: boolean;
  subjectClassMapping?: SubjectClassMapping;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  sessionId: string;
  markedById: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  method: 'QR_FACE' | 'MANUAL' | 'QR_ONLY';
  markedAt: string;
  latitude?: number;
  longitude?: number;
  faceVerified: boolean;
  faceMatchScore?: number;
  deviceInfo?: string;
  notes?: string;
  student?: StudentProfile & { user: User };
  session?: ClassSession;
  markedBy?: User;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface QRCodeData {
  sessionId: string;
  token: string;
  timestamp: number;
  type: 'ATTENDANCE_QR';
}

export interface GeofenceResult {
  isWithin: boolean;
  distance: number;
  allowedRadius: number;
}

export interface FaceVerificationResult {
  isMatch: boolean;
  distance: number;
  matchScore: number;
}