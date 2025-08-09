
import { NextResponse, type NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { auth } from 'firebase-admin';
import { getFirebaseAdminApp } from '@/lib/firebase-admin-config';
import { ObjectId } from 'mongodb';
import { uploadToCloudinary } from '@/lib/cloudinary-service';

// Required for Next.js API routes that handle file streams
export const dynamic = 'force-dynamic';

const getUserIdFromToken = async (request: NextRequest): Promise<string | null> => {
  const authorization = request.headers.get('Authorization');
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null;
  }
  const idToken = authorization.split('Bearer ')[1];
  try {
    getFirebaseAdminApp(); // Ensure admin app is initialized
    const decodedToken = await auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return null;
  }
};

// --- GET Endpoint: Fetch documents for the logged-in user ---
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const documents = await db
      .collection('userFiles')
      .find({
        userId,
        uploadedAt: { $gte: twentyFourHoursAgo },
      })
      .sort({ uploadedAt: -1 })
      .toArray();
      
    // Convert ObjectId to string for JSON serialization
    const sanitizedDocs = documents.map(doc => ({
      ...doc,
      _id: doc._id.toString(),
    }));

    return NextResponse.json(sanitizedDocs, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents', details: error.message }, { status: 500 });
  }
}

// --- POST Endpoint: Upload a new document ---
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentUploadsCount = await db.collection('userFiles').countDocuments({
      userId,
      uploadedAt: { $gte: twentyFourHoursAgo },
    });

    if (recentUploadsCount >= 10) {
      return NextResponse.json({ error: 'File upload limit (10 per 24 hours) reached.' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }
     if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Invalid file type. Only PDF is allowed.' }, { status: 400 });
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload buffer to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(fileBuffer);
    if (!cloudinaryResult) {
        throw new Error('Failed to upload to Cloudinary');
    }

    // Save metadata to MongoDB
    const newDocument = {
      userId,
      fileName: file.name,
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      uploadedAt: new Date(),
    };

    const result = await db.collection('userFiles').insertOne(newDocument);

    return NextResponse.json({
        message: 'File uploaded successfully',
        documentId: result.insertedId,
        url: cloudinaryResult.secure_url,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error in file upload:', error);
    return NextResponse.json({ error: 'File upload failed', details: error.message }, { status: 500 });
  }
}

// --- DELETE Endpoint: Delete a document ---
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { docId } = await request.json();
    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }
    
    if (!ObjectId.isValid(docId)) {
      return NextResponse.json({ error: 'Invalid Document ID format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Find the document to get the Cloudinary public_id before deleting from DB
    const documentToDelete = await db.collection('userFiles').findOne({
        _id: new ObjectId(docId),
        userId, // Security check: Ensure user owns the document
    });

    if (!documentToDelete) {
        return NextResponse.json({ error: 'Document not found or user not authorized' }, { status: 404 });
    }

    // Note: Cloudinary deletion logic can be added here if needed, but lifecycle rules are preferred.
    // For manual deletion:
    // if (documentToDelete.cloudinaryPublicId) {
    //   await deleteFromCloudinary(documentToDelete.cloudinaryPublicId);
    // }

    const result = await db.collection('userFiles').deleteOne({ _id: new ObjectId(docId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Document deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json({ error: 'Failed to delete document', details: error.message }, { status: 500 });
  }
}
