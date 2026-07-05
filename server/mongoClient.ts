import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || '';

let client: MongoClient | null = null;

export async function getMongoClient() {
  if (!uri) throw new Error('MONGODB_URI not set');
  if (client) return client;
  client = new MongoClient(uri);
  await client.connect();
  return client;
}

export async function closeMongoClient() {
  if (client) await client.close();
}
