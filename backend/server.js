const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const onFinished = require('on-finished');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Attach io to app for use in controllers
app.set('io', io);

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global Audit Logger Middleware (Auto-saves to AuditLog database)
const AuditLog = require('./models/AuditLog');
app.use((req, res, next) => {
  // Use on-finished to reliably trigger after response is sent
  onFinished(res, async () => {
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // Only log state-changing successful requests (POST, PUT, PATCH, DELETE)
    const isLoggable = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const isSuccess = statusCode >= 200 && statusCode < 300;

    // req.user is set by your 'protect' auth middleware
    // We must check for it here, after the auth middleware has run
    if (isLoggable && isSuccess && req.user) {
        try {
          let actionType = 'accessed';
          if (method === 'POST') actionType = 'created';
          if (method === 'PUT' || method === 'PATCH') actionType = 'updated';
          if (method === 'DELETE') actionType = 'deleted';
          
          // Extract resource from URL (e.g., /api/tasks -> tasks)
          const resource = originalUrl.split('/')[2]?.split('?')[0] || 'system';
          
          await AuditLog.create({
            user: req.user._id,
            action: `${actionType} ${resource}`,
            resource: resource
          });
          console.log(`✅ Audit log saved: User ${req.user.id} ${actionType} ${resource}`);
        } catch (err) {
          console.error(' Failed to save audit log:', err);
        }
    }
  });

  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));

app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File is too large. Max size is 10MB per file.' });
  }
  if (err.message === 'File type not allowed') {
    return res.status(400).json({ success: false, message: 'File type not allowed.' });
  }
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join_room', (userId) => socket.join(userId));
  socket.on('join_team', (teamId) => socket.join(teamId));
  socket.on('join_task', (taskId) => socket.join(taskId));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/task_management_db')
  .then(() => {
    console.log('MongoDB connected');
    server.listen(process.env.PORT || 5000, () =>
      console.log(`Server running on port ${process.env.PORT || 5000}`)
    );
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Triggering restart
