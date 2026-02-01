import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import http from 'http';
import { PORT, MONGO_URI, CLIENT_URL } from './config';
import authRoutes from './routes/auth';
import graphRoutes from './routes/graph';
import * as projectController from './controllers/projectController'; // Import controller
import { authenticate } from './middleware/authMiddleware'; // Import middleware
import { initSocket } from './socket';

const app = express();

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); 

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

mongoose.connection.on('error', err => {
    console.error('MongoDB Runtime Error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB Disconnected - Attempting to help backend stay alive');
});

// HTTP Server & Socket.io
const server = http.createServer(app);

initSocket(server, CLIENT_URL);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/graph', graphRoutes);

// Legacy/Root Routes
app.post('/api/save-project', authenticate, projectController.saveProject);

app.get('/', (req, res) => {
  res.send('Visual DB Viewer Backend API');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
