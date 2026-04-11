import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chrono-bank';
const MONGODB_DB = process.env.MONGODB_DB || 'chrono-bank';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not set');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const db = client.db(MONGODB_DB);
  
  // Create indexes for performance
  await createIndexes(db);
  
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

async function createIndexes(db: Db) {
  try {
    // Users indexes
    const usersCollection = db.collection('users');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ username: 1 }, { unique: true });

    // Accounts indexes
    const accountsCollection = db.collection('accounts');
    await accountsCollection.createIndex({ userId: 1 });

    // Transactions indexes
    const transactionsCollection = db.collection('transactions');
    await transactionsCollection.createIndex({ userId: 1 });
    await transactionsCollection.createIndex({ accountId: 1 });
    await transactionsCollection.createIndex({ date: -1 });
    await transactionsCollection.createIndex({ category: 1 });

    // Budgets indexes
    const budgetsCollection = db.collection('budgets');
    await budgetsCollection.createIndex({ userId: 1 });
    await budgetsCollection.createIndex({ category: 1 });

    // Alerts indexes
    const alertsCollection = db.collection('alerts');
    await alertsCollection.createIndex({ userId: 1 });
    await alertsCollection.createIndex({ createdAt: -1 });
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}
