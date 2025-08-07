
import { NextResponse, type NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { Readable } from 'stream';
import { auth as adminAuth } from 'firebase-admin';
import { getFirebaseAdminApp } from '@/lib/firebase-admin-config';
import { ObjectId } from 'mongodb';

// This is the crucial fix: It ensures this route is always run dynamically on the server.
export const dynamic = 'force-dynamic';

// Helper to verify Firebase ID token and get UID
async function getUserId(request: NextRequest): Promise<string | null> {
    const authorization = request.headers.get('Authorization');
    if (authorization?.startsWith('Bearer ')) {
        const idToken = authorization.split('Bearer ')[1];
        try {
            const decodedToken = await adminAuth(getFirebaseAdminApp()).verifyIdToken(idToken);
            return decodedToken.uid;
        } catch (error) {
            console.error('Error verifying Firebase ID token:', error);
            return null;
        }
    }
    return null;
}

// GET handler to fetch user's documents
export async function GET(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { bucket } = await connectToDatabase();
        const documents = await bucket.find({ 'metadata.userId': userId }).toArray();
        return NextResponse.json(documents);
    } catch (error) {
        console.error('Failed to fetch documents:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

// POST handler to upload a new document
export async function POST(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { db, bucket } = await connectToDatabase();
        
        const count = await db.collection('pdfs.files').countDocuments({ 'metadata.userId': userId });
        if (count >= 10) {
            return NextResponse.json({ error: 'Maximum file limit of 10 reached.' }, { status: 400 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }
        
        const buffer = Buffer.from(await file.arrayBuffer());
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null); // Signify end of stream

        const uploadStream = bucket.openUploadStream(file.name, {
            metadata: {
                contentType: file.type,
                userId: userId,
            },
        });

        await new Promise((resolve, reject) => {
            stream.pipe(uploadStream)
                .on('error', reject)
                .on('finish', resolve);
        });

        return NextResponse.json({ message: 'File uploaded successfully', fileId: uploadStream.id }, { status: 201 });
    } catch (error) {
        console.error('File upload failed:', error);
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }
}


// DELETE handler to remove a document
export async function DELETE(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
        return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }
    
    try {
        const { bucket, db } = await connectToDatabase();
        const file = await db.collection('pdfs.files').findOne({ 
            _id: new ObjectId(fileId), 
            'metadata.userId': userId 
        });

        if (!file) {
            return NextResponse.json({ error: 'File not found or you do not have permission to delete it.' }, { status: 404 });
        }

        await bucket.delete(new ObjectId(fileId));
        return NextResponse.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Failed to delete file:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
