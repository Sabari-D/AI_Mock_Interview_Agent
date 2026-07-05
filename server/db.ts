import fs from 'fs';
import path from 'path';
import { getMongoClient } from './mongoClient.js';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

// Ensure DB directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

interface DatabaseSchema {
  [key: string]: any[];
}

const DEFAULT_DB: DatabaseSchema = {
  users: [],
  resumes: [],
  sessions: [],
  turns: [],
  reports: [],
  streaks: [],
  leaderboard: [],
  achievements: [],
  activityLogs: [],
  daily_activity_logs: [],
  notifications: [],
  notifications_log: [],
  adminActions: []
};

// In-memory cache
let dbData: DatabaseSchema = { ...DEFAULT_DB };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      dbData = { ...DEFAULT_DB, ...parsed };
    } else {
      saveDB();
    }
  } catch (e) {
    console.error('Error loading DB, using defaults', e);
    dbData = { ...DEFAULT_DB };
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing DB', e);
  }
}

// Load database immediately
loadDB();

// If MONGODB_URI is provided, we will attempt remote connections lazily.
const USE_REMOTE_DB = !!process.env.MONGODB_URI;
let mongoClientPromise: Promise<any> | null = null;

// Collection implementation that mimics MongoDB APIs
class FileMongoCollection<T extends { id?: string; _id?: string; [key: string]: any }> {
  private collectionName: string;

  constructor(name: string) {
    this.collectionName = name;
  }

  private getItems(): T[] {
    if (!dbData[this.collectionName]) {
      dbData[this.collectionName] = [];
    }
    return dbData[this.collectionName] as T[];
  }

  private setItems(items: T[]) {
    dbData[this.collectionName] = items;
    saveDB();
  }

  async find(query: Partial<T> = {}): Promise<T[]> {
    const items = this.getItems();
    return items.filter(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
  }

  async findOne(query: Partial<T> = {}): Promise<T | null> {
    const items = this.getItems();
    const found = items.find(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });
    return found || null;
  }

  async insertOne(doc: Omit<T, 'id' | '_id'> & { id?: string; _id?: string }): Promise<T> {
    const items = this.getItems();
    const id = doc.id || doc._id || Math.random().toString(36).substring(2, 11);
    const newDoc = {
      id,
      _id: id,
      ...doc,
      created_at: doc.created_at || new Date().toISOString()
    } as unknown as T;
    
    items.push(newDoc);
    this.setItems(items);
    return newDoc;
  }

  async insertMany(docs: Array<Omit<T, 'id' | '_id'> & { id?: string; _id?: string }>): Promise<T[]> {
    const items = this.getItems();
    const newDocs = docs.map(doc => {
      const id = doc.id || doc._id || Math.random().toString(36).substring(2, 11);
      return {
        id,
        _id: id,
        ...doc,
        created_at: doc.created_at || new Date().toISOString()
      } as unknown as T;
    });
    
    items.push(...newDocs);
    this.setItems(items);
    return newDocs;
  }

  async updateOne(query: Partial<T>, update: Partial<T>): Promise<{ modifiedCount: number }> {
    const items = this.getItems();
    const index = items.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index === -1) {
      return { modifiedCount: 0 };
    }

    items[index] = {
      ...items[index],
      ...update,
      updated_at: new Date().toISOString()
    };
    
    this.setItems(items);
    return { modifiedCount: 1 };
  }

  async updateMany(query: Partial<T>, update: Partial<T>): Promise<{ modifiedCount: number }> {
    const items = this.getItems();
    let modifiedCount = 0;

    const updated = items.map(item => {
      let matches = true;
      for (const key in query) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        modifiedCount++;
        return {
          ...item,
          ...update,
          updated_at: new Date().toISOString()
        };
      }
      return item;
    });

    this.setItems(updated);
    return { modifiedCount };
  }

  async deleteOne(query: Partial<T>): Promise<{ deletedCount: number }> {
    const items = this.getItems();
    const index = items.findIndex(item => {
      for (const key in query) {
        if (item[key] !== query[key]) return false;
      }
      return true;
    });

    if (index === -1) {
      return { deletedCount: 0 };
    }

    items.splice(index, 1);
    this.setItems(items);
    return { deletedCount: 1 };
  }

  async deleteMany(query: Partial<T>): Promise<{ deletedCount: number }> {
    const items = this.getItems();
    const initialCount = items.length;
    const filtered = items.filter(item => {
      let matches = true;
      for (const key in query) {
        if (item[key] !== query[key]) {
          matches = false;
          break;
        }
      }
      return !matches;
    });

    this.setItems(filtered);
    return { deletedCount: initialCount - filtered.length };
  }
}

// Export collections and direct utility functions as a single unified db object
// Remote collection wrapper that uses the mongodb driver
class RemoteMongoCollection<T extends { id?: string; _id?: string; [key: string]: any }> {
  private collName: string;
  private fallback: FileMongoCollection<T>;

  constructor(name: string) {
    this.collName = name;
    this.fallback = new FileMongoCollection<T>(name);
  }

  private async initializeClient() {
    if (!mongoClientPromise) {
      mongoClientPromise = (async () => {
        try {
          return await getMongoClient();
        } catch (err: any) {
          mongoClientPromise = null;
          throw err;
        }
      })();
    }
    return mongoClientPromise;
  }

  private async coll() {
    const client = await this.initializeClient();
    if (!client) {
      throw new Error('Mongo client not available');
    }
    const dbName = process.env.MONGODB_DB || 'Mock_Agent';
    if (!(client as any).__mockAgentConnected) {
      console.log('Remote MongoDB connected:', {
        uri: process.env.MONGODB_URI,
        dbName,
        collection: this.collName
      });
      (client as any).__mockAgentConnected = true;
    }
    return client.db(dbName).collection(this.collName);
  }

  private async remoteOrFallback<TRes>(
    remoteFn: (collection: any) => Promise<TRes>,
    fallbackFn: (fallback: FileMongoCollection<T>) => Promise<TRes>
  ): Promise<TRes> {
    try {
      const collection = await this.coll();
      return await remoteFn(collection);
    } catch (err: any) {
      console.warn(`Remote MongoDB unavailable for collection ${this.collName}, falling back to local JSON DB.`, err.message || err);
      return fallbackFn(this.fallback);
    }
  }

  async find(query: Partial<T> = {}) {
    return this.remoteOrFallback(
      collection => collection.find(query).toArray(),
      fallback => fallback.find(query)
    );
  }

  async findOne(query: Partial<T> = {}) {
    return this.remoteOrFallback(
      collection => collection.findOne(query),
      fallback => fallback.findOne(query)
    );
  }

  async insertOne(doc: any) {
    return this.remoteOrFallback(
      async (collection) => {
        const id = doc.id || doc._id || Math.random().toString(36).substring(2, 11);
        const newDoc = {
          id,
          _id: id,
          ...doc,
          created_at: doc.created_at || new Date().toISOString()
        };
        await collection.insertOne(newDoc);
        return newDoc;
      },
      fallback => fallback.insertOne(doc)
    );
  }

  async insertMany(docs: any[]) {
    return this.remoteOrFallback(
      async (collection) => {
        const newDocs = docs.map(doc => {
          const id = doc.id || doc._id || Math.random().toString(36).substring(2, 11);
          return {
            id,
            _id: id,
            ...doc,
            created_at: doc.created_at || new Date().toISOString()
          };
        });
        await collection.insertMany(newDocs);
        return newDocs;
      },
      fallback => fallback.insertMany(docs)
    );
  }

  async updateOne(query: Partial<T>, update: Partial<T>) {
    return this.remoteOrFallback(
      collection => collection.updateOne(query as any, { $set: update as any }),
      fallback => fallback.updateOne(query, update)
    );
  }

  async updateMany(query: Partial<T>, update: Partial<T>) {
    return this.remoteOrFallback(
      collection => collection.updateMany(query as any, { $set: update as any }),
      fallback => fallback.updateMany(query, update)
    );
  }

  async deleteOne(query: Partial<T>) {
    return this.remoteOrFallback(
      collection => collection.deleteOne(query as any),
      fallback => fallback.deleteOne(query)
    );
  }

  async deleteMany(query: Partial<T>) {
    return this.remoteOrFallback(
      collection => collection.deleteMany(query as any),
      fallback => fallback.deleteMany(query)
    );
  }
}

// Export collections and direct utility functions as a single unified db object
export const db = ((): any => {
  // If MONGODB_URI is set, use remote-wrapped collections (connection is attempted on demand)
  const useRemote = USE_REMOTE_DB;
  if (useRemote) {
    console.log('Using remote MongoDB:', {
      uri: process.env.MONGODB_URI,
      dbName: process.env.MONGODB_DB || 'Mock_Agent'
    });
    return {
      users: new RemoteMongoCollection('users'),
      resumes: new RemoteMongoCollection('resumes'),
      sessions: new RemoteMongoCollection('sessions'),
      turns: new RemoteMongoCollection('turns'),
      reports: new RemoteMongoCollection('reports'),
      streaks: new RemoteMongoCollection('streaks'),
      leaderboard: new RemoteMongoCollection('leaderboard'),
      achievements: new RemoteMongoCollection('achievements'),
      activityLogs: new RemoteMongoCollection('activityLogs'),
      daily_activity_logs: new RemoteMongoCollection('daily_activity_logs'),
      notifications: new RemoteMongoCollection('notifications'),
      adminActions: new RemoteMongoCollection('adminActions'),

      // helper utilities
      async find(collectionName: string, filterFn: (item: any) => boolean = () => true) {
        const coll = new RemoteMongoCollection(collectionName);
        const all = await coll.find({});
        return all.filter(filterFn);
      },

      async findOne(collectionName: string, filterFn: (item: any) => boolean) {
        const coll = new RemoteMongoCollection(collectionName);
        const all = await coll.find({});
        return all.find(filterFn) || null;
      },

      async insert(collectionName: string, doc: any) {
        const coll = new RemoteMongoCollection(collectionName);
        return coll.insertOne(doc);
      },

      async update(collectionName: string, filterFn: (item: any) => boolean, updateData: any) {
        const items = await this.find(collectionName, filterFn);
        let modifiedCount = 0;
        for (const it of items) {
          const q = { _id: it._id || it.id };
          await (new RemoteMongoCollection(collectionName)).updateOne(q, updateData);
          modifiedCount++;
        }
        return { modifiedCount };
      },

      async delete(collectionName: string, filterFn: (item: any) => boolean) {
        const items = await this.find(collectionName, filterFn);
        let deletedCount = 0;
        for (const it of items) {
          const q = { _id: it._id || it.id };
          await (new RemoteMongoCollection(collectionName)).deleteOne(q);
          deletedCount++;
        }
        return { deletedCount };
      }
    };
  }

  // fallback to file-based implementation
  return {
    // Collection properties
    users: new FileMongoCollection<any>('users'),
    resumes: new FileMongoCollection<any>('resumes'),
    sessions: new FileMongoCollection<any>('sessions'),
    turns: new FileMongoCollection<any>('turns'),
    reports: new FileMongoCollection<any>('reports'),
    streaks: new FileMongoCollection<any>('streaks'),
    leaderboard: new FileMongoCollection<any>('leaderboard'),
    achievements: new FileMongoCollection<any>('achievements'),
    activityLogs: new FileMongoCollection<any>('activityLogs'),
    daily_activity_logs: new FileMongoCollection<any>('daily_activity_logs'),
    notifications: new FileMongoCollection<any>('notifications'),
    adminActions: new FileMongoCollection<any>('adminActions'),

    // Directly-callable table/collection helpers
    async find<T = any>(collectionName: string, filterFn: (item: T) => boolean = () => true): Promise<T[]> {
      if (!dbData[collectionName]) {
        dbData[collectionName] = [];
      }
      const items = dbData[collectionName] as T[];
      return items.filter(filterFn);
    },

    async findOne<T = any>(collectionName: string, filterFn: (item: T) => boolean): Promise<T | null> {
      if (!dbData[collectionName]) {
        dbData[collectionName] = [];
      }
      const items = dbData[collectionName] as T[];
      const found = items.find(filterFn);
      return found || null;
    },

    async insert<T = any>(collectionName: string, doc: any): Promise<T> {
      if (!dbData[collectionName]) {
        dbData[collectionName] = [];
      }
      const items = dbData[collectionName];
      const id = doc.id || doc._id || Math.random().toString(36).substring(2, 11);
      const newDoc = {
        id,
        _id: id,
        ...doc,
        created_at: doc.created_at || new Date().toISOString()
      };
      items.push(newDoc);
      saveDB();
      return newDoc as T;
    },

    async update<T = any>(
      collectionName: string,
      filterFn: (item: T) => boolean,
      updateData: Partial<T> | ((item: T) => void)
    ): Promise<{ modifiedCount: number }> {
      if (!dbData[collectionName]) {
        dbData[collectionName] = [];
      }
      const items = dbData[collectionName] as T[];
      let modifiedCount = 0;
      
      items.forEach((item, index) => {
        if (filterFn(item)) {
          modifiedCount++;
          if (typeof updateData === 'function') {
            (updateData as any)(item);
          } else {
            items[index] = {
              ...item,
              ...updateData,
              updated_at: new Date().toISOString()
            };
          }
        }
      });

      if (modifiedCount > 0) {
        saveDB();
      }
      return { modifiedCount };
    },

    async delete<T = any>(collectionName: string, filterFn: (item: T) => boolean): Promise<{ deletedCount: number }> {
      if (!dbData[collectionName]) {
        dbData[collectionName] = [];
      }
      const items = dbData[collectionName] as T[];
      const initialLength = items.length;
      const remaining = items.filter(item => !filterFn(item));
      dbData[collectionName] = remaining;
      if (initialLength !== remaining.length) {
        saveDB();
      }
      return { deletedCount: initialLength - remaining.length };
    }
  };
})();
