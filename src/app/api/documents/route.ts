
import { NextResponse, type NextRequest } from 'next/server';
import { auth as adminAuth } from 'firebase-admin';
import { getFirebaseAdminApp } from '@/lib/firebase-admin-config';

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
// ** AWS Integration Point **
// In a real implementation, this would list files from your S3 bucket for the user.
export async function GET(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This is now a placeholder. You would replace this with a call to AWS SDK to list objects.
    // For example: `const userFiles = await listFilesFromS3(userId);`
    // The documents page now manages the file list on the client-side as a temporary measure.
    return NextResponse.json([]);
}

// POST handler to upload a new document
// ** AWS Integration Point **
// This is where you would use the AWS SDK to upload the file to S3.
export async function POST(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
        }

        // Here you would implement the AWS S3 upload logic.
        // Example using a placeholder function:
        // const s3Key = `uploads/${userId}/${Date.now()}-${file.name}`;
        // await uploadToS3(file, s3Key);

        // For now, we just simulate a successful upload.
        console.log(`Simulating upload for user ${userId}, file: ${file.name}`);

        // On success, you might return the S3 key or a success message.
        return NextResponse.json({ message: 'File uploaded successfully', simulatedKey: `${userId}/${file.name}` }, { status: 201 });

    } catch (error) {
        console.error('File upload failed:', error);
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 });
    }
}


// DELETE handler to remove a document
// ** AWS Integration Point **
// This is where you would use the AWS SDK to delete the object from S3.
export async function DELETE(request: NextRequest) {
    const userId = await getUserId(request);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('fileKey'); // You would pass the S3 key here

    if (!fileKey) {
        return NextResponse.json({ error: 'File key is required' }, { status: 400 });
    }
    
    try {
        // Here you would implement the AWS S3 delete logic.
        // Example using a placeholder function:
        // await deleteFromS3(fileKey);

        console.log(`Simulating deletion for user ${userId}, file key: ${fileKey}`);

        return NextResponse.json({ message: 'File deleted successfully' });
    } catch (error) {
        console.error('Failed to delete file:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
