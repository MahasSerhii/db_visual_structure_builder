import express from 'express';

import cors from 'cors';

import dotenv from 'dotenv';

import mongoose from 'mongoose';

import http from 'http';

import authRoutes from './routes/auth';

import graphRoutes from './routes/graph';

import { initSocket } from './socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Increase API limit for large graphs

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

app.get('/', (req, res) => {
  res.send('Visual DB Viewer Backend API');
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
