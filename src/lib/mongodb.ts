
import { MongoClient, Db, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;

// In production (Vercel), the build process might not have the env var, but the runtime will.
// In development, we want to fail fast if it's not set.
if (!uri && process.env.NODE_ENV === 'development') {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Extend NodeJS.Global interface to add the `_mongoClientPromise` property
declare global {
  namespace globalThis {
    var _mongoClientPromise: Promise<MongoClient>;
  }
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri!, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
    });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri!, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  clientPromise = client.connect();
}

let db: Db;

export async function connectToDatabase() {
  if (db) {
    return { db };
  }
  
  const client = await clientPromise;
  db = client.db(); // The database name is usually part of the connection string
  
  return { db };
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
