
"use client";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  getBlob
} from 'firebase/storage';
import { firestore, storage, auth } from './firebase';
import { v4 as uuidv4 } from 'uuid';

const USERS_COLLECTION = 'users';
const DOCUMENTS_SUBCOLLECTION = 'documents';
const USER_FILES_STORAGE_PATH = 'user_files';

export interface UserDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string;
  downloadURL: string;
  uploadedAt: any; // Can be Timestamp or Date
}

// Helper to map Firestore doc to UserDocument object
const mapDocToUserDocument = (docSnap: any): UserDocument => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    uploadedAt: data.uploadedAt instanceof Timestamp ? data.uploadedAt.toDate() : new Date(data.uploadedAt),
  };
};

/**
 * Uploads one or more documents for a specific user.
 * @param userId - The UID of the user.
 * @param files - An array of File objects to upload.
 */
export async function uploadUserDocuments(userId: string, files: File[]): Promise<void> {
  if (!userId) throw new Error("User authentication is required to upload documents.");
  if (!files || files.length === 0) throw new Error("No files selected for upload.");

  const documentsCollectionRef = collection(firestore, USERS_COLLECTION, userId, DOCUMENTS_SUBCOLLECTION);

  const uploadPromises = files.map(async (file) => {
    const uniqueFileName = `${uuidv4()}-${file.name}`;
    const storagePath = `${USER_FILES_STORAGE_PATH}/${userId}/${uniqueFileName}`;
    const storageRef = ref(storage, storagePath);

    // Upload file to Firebase Storage
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Create a document in Firestore
    const docData: Omit<UserDocument, 'id'|'uploadedAt'> = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storagePath: storagePath,
      downloadURL: downloadURL,
    };

    await addDoc(documentsCollectionRef, {
        ...docData,
        uploadedAt: serverTimestamp(),
    });
  });

  await Promise.all(uploadPromises);
}

/**
 * Fetches all documents for a specific user.
 * @param userId - The UID of the user.
 * @returns An array of UserDocument objects.
 */
export async function getUserDocuments(userId: string): Promise<UserDocument[]> {
  if (!userId) return [];

  const documentsCollectionRef = collection(firestore, USERS_COLLECTION, userId, DOCUMENTS_SUBCOLLECTION);
  const q = query(documentsCollectionRef, orderBy('uploadedAt', 'desc'));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(mapDocToUserDocument);
}

/**
 * Deletes a user's document from Firestore and Firebase Storage.
 * @param userId - The UID of the user.
 * @param docId - The Firestore document ID.
 * @param storagePath - The path of the file in Firebase Storage.
 */
export async function deleteUserDocument(userId: string, docId: string, storagePath: string): Promise<void> {
  if (!userId || !docId || !storagePath) {
    throw new Error("Missing required information to delete the document.");
  }
  
  // Delete from Firestore
  const docRef = doc(firestore, USERS_COLLECTION, userId, DOCUMENTS_SUBCOLLECTION, docId);
  await deleteDoc(docRef);

  // Delete from Storage
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}


/**
 * Downloads a file from a given storage path and returns it as an ArrayBuffer.
 * @param storagePath - The full path to the file in Firebase Storage.
 * @returns A promise that resolves with the file's ArrayBuffer.
 */
export async function downloadFileFromStorage(storagePath: string): Promise<ArrayBuffer> {
    const storageRef = ref(storage, storagePath);
    const blob = await getBlob(storageRef);
    return blob.arrayBuffer();
}
