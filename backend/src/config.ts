import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-me';
export const MONGO_URI = process.env.MONGO_URI || '';
export const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
export const PORT = process.env.PORT || 3001;
