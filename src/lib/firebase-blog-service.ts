
"use client";

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  Timestamp,
  limit,
  startAfter,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { firestore, storage, auth } from './firebase';
import type { BlogPost, BlogPostStatus } from '@/types/blog';

const BLOG_POSTS_COLLECTION = 'blog_posts';
const BLOG_THUMBNAILS_STORAGE_PATH = 'blog_thumbnails';

// Helper to convert Firestore Timestamps to Dates in a BlogPost object
const mapDocToBlogPost = (docSnap: DocumentData): BlogPost => {
  const data = docSnap.data() as BlogPost;
  return {
    ...data,
    id: docSnap.id,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt as any),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt as any),
  };
};

export async function createBlogPost(postData: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'slug'>, newSlug: string): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication required to create a blog post.");
  }
  try {
    const docRef = await addDoc(collection(firestore, BLOG_POSTS_COLLECTION), {
      ...postData,
      slug: newSlug,
      authorId: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating blog post:", error);
    throw error;
  }
}

export async function updateBlogPost(postId: string, postData: Partial<Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt' | 'slug'>>, newSlug?: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication required to update a blog post.");
  }
  try {
    const postRef = doc(firestore, BLOG_POSTS_COLLECTION, postId);
    const updateData: Partial<BlogPost> = {
      ...postData,
      authorId: currentUser.uid,
      updatedAt: serverTimestamp(),
    };
    if (newSlug) {
      updateData.slug = newSlug;
    }
    await updateDoc(postRef, updateData);
  } catch (error) {
    console.error("Error updating blog post:", error);
    throw error;
  }
}

export async function deleteBlogPost(postId: string): Promise<void> {
  try {
    const postRef = doc(firestore, BLOG_POSTS_COLLECTION, postId);
    // Optionally, delete associated thumbnail from storage if it exists
    const postSnap = await getDoc(postRef);
    if (postSnap.exists()) {
      const postData = postSnap.data() as BlogPost;
      if (postData.thumbnailImageUrl) {
        try {
          const storageImageRef = ref(storage, postData.thumbnailImageUrl);
          await deleteObject(storageImageRef);
        } catch (storageError: any) {
          // Log error but don't let it block post deletion if image not found
          if (storageError.code !== 'storage/object-not-found') {
            console.warn("Error deleting thumbnail image during post deletion:", storageError);
          }
        }
      }
    }
    await deleteDoc(postRef);
  } catch (error) {
    console.error("Error deleting blog post:", error);
    throw error;
  }
}

export async function getBlogPostById(postId: string): Promise<BlogPost | null> {
  try {
    const postRef = doc(firestore, BLOG_POSTS_COLLECTION, postId);
    const docSnap = await getDoc(postRef);
    if (docSnap.exists()) {
      return mapDocToBlogPost(docSnap);
    }
    return null;
  } catch (error) {
    console.error("Error fetching blog post by ID:", error);
    throw error;
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const q = query(collection(firestore, BLOG_POSTS_COLLECTION), where("slug", "==", slug), where("status", "==", "published"), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return mapDocToBlogPost(querySnapshot.docs[0]);
    }
    return null;
  } catch (error) {
    console.error("Error fetching blog post by slug:", error);
    throw error;
  }
}


export interface PaginatedBlogPosts {
  posts: BlogPost[];
  lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function getAllBlogPosts(
  forAdmin: boolean = false,
  postsLimit: number = 10,
  startAfterDoc: QueryDocumentSnapshot<DocumentData> | null = null
): Promise<PaginatedBlogPosts> {
  try {
    const baseQueryConstraints = [
      orderBy('createdAt', 'desc'),
      limit(postsLimit)
    ];

    // For public-facing pages, we now filter *after* fetching to avoid the composite index requirement.
    // For the admin panel, we fetch all posts regardless of status.
    if (!forAdmin) {
      // No 'where' clause here to avoid the index error.
    }
    
    if (startAfterDoc) {
      baseQueryConstraints.push(startAfter(startAfterDoc));
    }
    
    const q = query(collection(firestore, BLOG_POSTS_COLLECTION), ...baseQueryConstraints as any);

    const querySnapshot = await getDocs(q);
    
    let allFetchedPosts = querySnapshot.docs.map(mapDocToBlogPost);

    // If it's not for the admin panel, filter out non-published posts now.
    if (!forAdmin) {
        allFetchedPosts = allFetchedPosts.filter(post => post.status === 'published');
    }

    const lastVisibleDoc = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null;
    
    // Check if there are more documents.
    // Note: This 'hasMore' check might sometimes be true even if the next page has no published posts.
    // The UI will handle this gracefully by just not showing more posts.
    let hasMore = false;
    if (lastVisibleDoc) {
      const nextQuery = query(collection(firestore, BLOG_POSTS_COLLECTION), orderBy('createdAt', 'desc'), startAfter(lastVisibleDoc), limit(1));
      const nextSnapshot = await getDocs(nextQuery);
      hasMore = !nextSnapshot.empty;
    }

    return { posts: allFetchedPosts, lastVisibleDoc, hasMore };
  } catch (error) {
    console.error("Error fetching all blog posts:", error);
    throw error;
  }
}


export async function uploadBlogThumbnail(file: File, postId?: string): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Authentication required to upload a thumbnail.");
  }
  try {
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${postId || 'temp'}_${Date.now()}.${fileExtension}`;
    const storageRefInstance = ref(storage, `${BLOG_THUMBNAILS_STORAGE_PATH}/${uniqueFileName}`);
    
    const snapshot = await uploadBytes(storageRefInstance, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading blog thumbnail:", error);
    throw error;
  }
}

export async function checkSlugExists(slug: string, currentPostId?: string): Promise<boolean> {
  try {
    const q = query(collection(firestore, BLOG_POSTS_COLLECTION), where("slug", "==", slug));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return false; // Slug does not exist
    }
    // If currentPostId is provided, check if the found slug belongs to a different post
    if (currentPostId) {
      return querySnapshot.docs.some(doc => doc.id !== currentPostId);
    }
    return true; // Slug exists and no currentPostId to compare against (e.g., creating new post)
  } catch (error) {
    console.error("Error checking if slug exists:", error);
    throw error; // Or handle as needed, e.g., assume it exists to be safe
  }
}
