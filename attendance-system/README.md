# Attendance Management System

A comprehensive attendance management system with QR code scanning, face verification, geofencing, and role-based access control.

## Features

### Core Features
- **QR Code Attendance**: Teachers generate QR codes, students scan to mark attendance
- **Face Verification**: On-device face recognition using expo-face-detector (simulated for demo)
- **Geofencing**: Location-based attendance with configurable radius
- **Manual Attendance**: Teachers can mark attendance manually
- **Real-time Updates**: Socket.io for live attendance updates

### Role-Based Access
- **Students**: Scan QR, verify face, view attendance history
- **Teachers**: Create sessions, generate QR, manual attendance, analytics
- **Platform Owner**: Manage institutions, users, platform analytics

### Technical Stack
- **Backend**: Node.js + Express + PostgreSQL (Prisma ORM)
- **Frontend**: React Native (Expo) with TypeScript
- **Authentication**: JWT with refresh tokens
- **Database**: PostgreSQL with comprehensive schema
- **Real-time**: Socket.io

## Project Structure

```
attendance-system/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth, error handling
│   │   ├── models/         # Prisma models (via schema)
│   │   ├── routes/         # API routes
│   │   ├── utils/          # QR, face, geofence utilities
│   │   └── index.js        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.js         # Demo data
│   └── package.json
└── frontend/
    ├── app/                # Expo Router screens
    ├── src/
    │   ├── components/     # Reusable UI components
    │   ├── context/        # React context providers
    │   ├── hooks/          # Custom hooks
    │   ├── screens/        # Screen components
    │   ├── services/       # API service
    │   ├── types/          # TypeScript types
    │   └── utils/          # Utility functions
    └── package.json
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Xcode for mobile development

### Backend Setup

1. Navigate to backend directory:
```bash
cd attendance-system/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

4. Set up database:
```bash
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
```

5. Start server:
```bash
npm run dev
```

Server runs on `http://localhost:3000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd attendance-system/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure API URL:
```bash
# Create .env file
echo "EXPO_PUBLIC_API_URL=http://localhost:3000/api" > .env
```

4. Start Expo:
```bash
npm start
```

5. Run on device/emulator:
- Press `a` for Android
- Press `i` for iOS
- Press `w` for web

## Demo Credentials

After seeding the database:

| Role | Email | Password |
|------|-------|----------|
| Platform Owner | owner@attendance.com | password123 |
| Teacher | teacher1@techuniv.edu | password123 |
| Teacher | teacher2@techuniv.edu | password123 |
| Student | amit@student.techuniv.edu | password123 |
| Student | priya@student.techuniv.edu | password123 |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### QR Code
- `POST /api/qr/generate` - Generate QR for session (Teacher)
- `POST /api/qr/verify` - Verify QR code (Student)
- `GET /api/qr/session/:id/status` - Get QR status

### Attendance
- `POST /api/attendance/mark` - Mark attendance via QR+Face (Student)
- `POST /api/attendance/manual` - Manual attendance (Teacher)
- `GET /api/attendance/session/:id` - Get session attendance
- `GET /api/attendance/my-records` - Get student's attendance
- `GET /api/attendance/class/:id/summary` - Get class analytics (Teacher)

### Sessions
- `POST /api/sessions` - Create session (Teacher)
- `GET /api/sessions` - List sessions
- `GET /api/sessions/upcoming` - Get upcoming sessions (Student)
- `PUT /api/sessions/:id/start` - Start session
- `PUT /api/sessions/:id/end` - End session
- `PUT /api/sessions/:id/geofence` - Update geofence

### Face Recognition
- `POST /api/face/enroll` - Enroll face
- `GET /api/face/status` - Check enrollment status
- `DELETE /api/face/enroll` - Remove face enrollment

### Users & Management
- `GET /api/users` - List users (Owner/Teacher)
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user (Owner)

### Institutions
- `POST /api/institutions` - Create institution (Owner)
- `GET /api/institutions` - List institutions
- `PUT /api/institutions/:id` - Update institution
- `DELETE /api/institutions/:id` - Delete institution (Owner)

### Classes & Subjects
- `POST /api/classes` - Create class
- `GET /api/classes` - List classes
- `POST /api/subjects` - Create subject
- `POST /api/subjects/assign` - Assign subject to class

## Database Schema

Key models:
- **User**: Authentication, roles (STUDENT/TEACHER/PLATFORM_OWNER)
- **StudentProfile**: Student ID, branch, class, semester
- **TeacherProfile**: Employee ID, department, subjects
- **Institution**: Organization with owner
- **Class**: Branch, semester, section
- **Subject**: Course code, name, credits
- **ClassSession**: Scheduled class with QR, geofence
- **AttendanceRecord**: Student attendance with face verification
- **FaceEnrollment**: Stored face descriptors

## Face Recognition

The system uses on-device face detection via `expo-face-detector`. For production, integrate with:
- `face-api.js` (TensorFlow.js based)
- AWS Rekognition / Azure Face API
- Custom ML model

Current implementation simulates face descriptors for demo purposes.

## Geofencing

Uses Haversine formula for distance calculation:
- Teacher sets location (lat/lng) and radius
- Student location verified on QR scan
- Configurable per session (default 50m)

## Real-time Features

Socket.io events:
- `join-session` / `leave-session` - Room management
- `qr-generated` - New QR available
- `attendance-marked` - Student marked present
- `attendance-manual` - Teacher manual entry
- `session-started` / `session-ended` - Session lifecycle

## Security

- JWT with short-lived access tokens (7d) and refresh tokens (30d)
- bcrypt password hashing (12 rounds)
- Role-based authorization middleware
- Input validation with express-validator
- Audit logging for all actions

## Development

### Backend Commands
```bash
npm run dev          # Start with nodemon
npm run start        # Production start
npx prisma studio    # Database GUI
npx prisma migrate dev  # Run migrations
```

### Frontend Commands
```bash
npm start            # Expo dev server
npm run android      # Android emulator
npm run ios          # iOS simulator
npm run web          # Web browser
npm run lint         # ESLint
```

## Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use PostgreSQL production database
3. Set secure JWT secrets
4. Configure CORS for production domain
5. Use PM2 or similar process manager

### Frontend
1. Build for production: `expo build:android` / `expo build:ios`
2. Configure `EXPO_PUBLIC_API_URL` for production API
3. Submit to App Store / Play Store

## License

MIT License - Feel free to use for educational or commercial purposes.