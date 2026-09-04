import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import prisma from './config/prisma.js';
import authRoutes from './routes/auth.js';
import attendanceRoutes from './routes/attendance.js';
import userRoutes from './routes/users.js';
import institutionRoutes from './routes/institutions.js';
import classRoutes from './routes/classes.js';
import subjectRoutes from './routes/subjects.js';
import sessionRoutes from './routes/sessions.js';
import qrRoutes from './routes/qr.js';
import faceRoutes from './routes/face.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  req.io = io;
  req.prisma = prisma;
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/attendance', authMiddleware, attendanceRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/institutions', authMiddleware, institutionRoutes);
app.use('/api/classes', authMiddleware, classRoutes);
app.use('/api/subjects', authMiddleware, subjectRoutes);
app.use('/api/sessions', authMiddleware, sessionRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/face', authMiddleware, faceRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });
  
  socket.on('leave-session', (sessionId) => {
    socket.leave(`session:${sessionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(config.port, () => {
  console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
});

export default app;