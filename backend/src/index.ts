import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { PORT, MONGO_URI, CLIENT_URL } from './config';
import authRoutes from './routes/auth';
import graphRoutes from './routes/graph';
import * as projectController from './controllers/projectController'; // Import controller
import { authenticate } from './middleware/authMiddleware'; // Import middleware
import { errorHandler } from './middleware/errorMiddleware';
import { NotFoundException } from './exceptions/HttpExceptions';
import { initSocket } from './socket';

const app = express();

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); 

// HTTP Server & Socket.io
const server = http.createServer(app);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/graph', graphRoutes);

// Legacy/Root Routes
app.post('/api/save-project', authenticate, projectController.saveProject);

app.get('/', (req, res) => {
  res.send('Visual DB Viewer Backend API');
});

// Handle undefined routes
app.all('*', (req, res, next) => {
  next(new NotFoundException(`Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
    
    // Init Socket & Start Server only after DB is ready
    initSocket(server, CLIENT_URL);
    
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

mongoose.connection.on('error', err => {
    console.error('MongoDB Runtime Error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB Disconnected - Attempting to help backend stay alive');
});
