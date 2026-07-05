import fs from 'fs/promises';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

function parseArg(name) {
  const idx = process.argv.findIndex(a => a === name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

const uri = parseArg('--uri') || process.env.MONGODB_URI;
const dbName = parseArg('--db') || process.env.MONGODB_DB || 'Mock_Agent';

if (!uri) {
  console.error('MONGODB URI not provided. Use --uri or set MONGODB_URI in .env');
  process.exit(1);
}

async function run() {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(uri, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);

  const filePath = './data/db.json';
  const exists = await fs.access(filePath).then(() => true).catch(() => false);
  if (!exists) {
    console.error('Local data file not found at', filePath);
    await client.close();
    process.exit(1);
  }

  const content = await fs.readFile(filePath, 'utf8');
  const parsed = JSON.parse(content);

  for (const [collectionName, docs] of Object.entries(parsed)) {
    if (!Array.isArray(docs) || docs.length === 0) {
      console.log(`Skipping collection '${collectionName}' (no documents)`);
      continue;
    }

    const coll = db.collection(collectionName);
    console.log(`Replacing documents in collection '${collectionName}' (count: ${docs.length})`);
    try {
      await coll.deleteMany({});
      // Ensure we don't insert undefined or functions
      const sanitized = docs.map(d => {
        // Remove any prototype functions and keep plain data
        return JSON.parse(JSON.stringify(d));
      });
      await coll.insertMany(sanitized, { ordered: false });
      console.log(`Inserted ${sanitized.length} documents into '${collectionName}'`);
    } catch (e) {
      console.error(`Error migrating collection ${collectionName}:`, e.message || e);
    }
  }

  await client.close();
  console.log('Migration finished. Your data is now in', `${uri} -> ${dbName}`);
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
