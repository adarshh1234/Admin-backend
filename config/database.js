import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PRIMARY_MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/letgetin';
const LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/letgetin';

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', false);

  try {
    const conn = await mongoose.connect(PRIMARY_MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.warn(`⚠️ Primary MongoDB Connection failed (${error.message}). Trying fallback local URI...`);
    if (PRIMARY_MONGODB_URI !== LOCAL_MONGODB_URI) {
      try {
        const localConn = await mongoose.connect(LOCAL_MONGODB_URI, {
          serverSelectionTimeoutMS: 2000,
        });
        isConnected = true;
        console.log(`✅ MongoDB Connected successfully to local fallback: ${localConn.connection.host}/${localConn.connection.name}`);
        return localConn.connection;
      } catch (localErr) {
        console.warn(`⚠️ Local MongoDB fallback also unavailable: ${localErr.message}`);
      }
    }
    throw error;
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

export default connectDB;
