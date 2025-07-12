import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer

export async function setupTestDB() {
  try {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function teardownTestDB() {
  try {
    await mongoose.disconnect();
    if (mongoServer) await mongoServer.stop();
    mongoServer = null;
  } catch (error) {
    console.error('Failed to teardown test database:', error);
    throw error;
  }
}