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

// TypeScript Interfaces for Database Documents
export interface User {
  _id?: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  preferences: {
    currency: string;
    timezone: string;
    theme: string;
  };
}

export interface Account {
  _id?: string;
  userId: string;
  name: string;
  type: 'checking' | 'savings' | 'investment' | 'credit';
  balance: number;
  currency: string;
  createdAt: Date;
}

export interface Transaction {
  _id?: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  category: string;
  amount: number;
  description: string;
  date: Date;
  scheduledDate?: Date;
  isRecurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  status: 'pending' | 'completed' | 'failed';
  tags: string[];
  createdAt: Date;
}

export interface Budget {
  _id?: string;
  userId: string;
  category: string;
  limitAmount: number;
  period: 'monthly' | 'yearly';
  startDate: Date;
  alertThreshold: number;
  createdAt: Date;
}

export interface Alert {
  _id?: string;
  userId: string;
  type: 'budget_exceeded' | 'anomaly_detected' | 'goal_milestone' | 'low_balance';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}
