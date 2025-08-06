
import { MongoClient, Db, GridFSBucket } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}
if (!dbName) {
  throw new Error('Please define the MONGODB_DB_NAME environment variable inside .env');
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let cachedBucket: GridFSBucket | null = null;

export async function connectToDatabase() {
  if (cachedClient && cachedDb && cachedBucket) {
    return { client: cachedClient, db: cachedDb, bucket: cachedBucket };
  }

  const client = await MongoClient.connect(uri!);

  const db = client.db(dbName!);
  const bucket = new GridFSBucket(db, { bucketName: 'pdfs' });

  cachedClient = client;
  cachedDb = db;
  cachedBucket = bucket;

  return { client, db, bucket };
}
