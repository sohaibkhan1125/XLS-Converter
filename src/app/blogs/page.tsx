
"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BookOpenText, Loader2 } from 'lucide-react';
import { getAllBlogPosts, type PaginatedBlogPosts } from '@/lib/firebase-blog-service';
import type { BlogPost } from '@/types/blog';
import LoadingSpinner from '@/components/core/loading-spinner';
import { format } from 'date-fns';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { usePathname } from 'next/navigation';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { subscribeToGeneralSettings } from '@/lib/firebase-settings-service';

const POSTS_PER_PAGE = 9; // Adjust as needed for layout (e.g., 3x3 grid)
const GENERIC_PAGE_TITLE = "Our Blog";
const GENERIC_PAGE_DESCRIPTION = "Read the latest articles and updates from our team.";

export default function BlogsPage() {
  const [blogPostsData, setBlogPostsData] = useState<PaginatedBlogPosts>({ posts: [], lastVisibleDoc: null, hasMore: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = subscribeToGeneralSettings((settings) => {
      const siteTitle = settings?.siteTitle || "Our App";
      let pageTitle = `${GENERIC_PAGE_TITLE} - ${siteTitle}`;
      let pageDescription = GENERIC_PAGE_DESCRIPTION;

      if (settings?.seoSettings && settings.seoSettings[pathname]) {
        const seoData = settings.seoSettings[pathname];
        if (seoData?.title) pageTitle = seoData.title;
        if (seoData?.description) pageDescription = seoData.description;
        
        let keywordsTag = document.querySelector('meta[name="keywords"]');
        if (!keywordsTag) {
          keywordsTag = document.createElement('meta');
          keywordsTag.setAttribute('name', 'keywords');
          document.head.appendChild(keywordsTag);
        }
        if (seoData?.keywords) keywordsTag.setAttribute('content', seoData.keywords);
      }
      document.title = pageTitle;
      let descriptionTag = document.querySelector('meta[name="description"]');
      if (!descriptionTag) {
        descriptionTag = document.createElement('meta');
        descriptionTag.setAttribute('name', 'description');
        document.head.appendChild(descriptionTag);
      }
      descriptionTag.setAttribute('content', pageDescription);
    });
    return () => unsubscribe();
  }, [pathname]);

  const fetchPosts = useCallback(async (lastDoc: QueryDocumentSnapshot<DocumentData> | null = null) => {
    if (lastDoc) setIsLoadingMore(true); else setIsLoading(true);
    setError(null);
    try {
      const paginatedResult = await getAllBlogPosts(false, POSTS_PER_PAGE, lastDoc); // forAdmin = false
      if (lastDoc) {
        setBlogPostsData(prev => ({
          posts: [...prev.posts, ...paginatedResult.posts],
          lastVisibleDoc: paginatedResult.lastVisibleDoc,
          hasMore: paginatedResult.hasMore,
        }));
      } else {
        setBlogPostsData(paginatedResult);
      }
    } catch (err: any) {
      console.error("Error fetching blog posts:", err);
      setError(err.message || "Failed to load blog posts. Please try again later.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleLoadMore = () => {
    if (blogPostsData.lastVisibleDoc && blogPostsData.hasMore && !isLoadingMore) {
      fetchPosts(blogPostsData.lastVisibleDoc);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-20rem)] items-center justify-center">
        <LoadingSpinner message="Loading blog posts..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-destructive text-lg">{error}</p>
        <Button onClick={() => fetchPosts()} className="mt-4">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-card shadow-lg rounded-lg">
        <h1 className="text-5xl font-extrabold text-primary mb-4 flex items-center justify-center">
          <BookOpenText className="mr-3 h-12 w-12" /> Our Blog
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Discover insights, tips, and updates from our team.
        </p>
      </section>

      {blogPostsData.posts.length === 0 ? (
        <section className="text-center py-16">
          <BookOpenText className="mx-auto h-24 w-24 text-muted-foreground/50 mb-6" />
          <h2 className="text-3xl font-semibold text-foreground mb-3">No Posts Yet</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            It looks like we haven&apos;t published any blog posts yet. Check back soon for exciting content!
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPostsData.posts.map((post) => (
            <Card key={post.id} className="flex flex-col overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 ease-in-out rounded-lg">
              <CardHeader className="p-0 relative aspect-video">
                <Link href={`/blog/${post.slug}`} aria-label={`Read more about ${post.title}`}>
                  <Image
                    src={post.thumbnailImageUrl || `https://placehold.co/800x400.png`}
                    alt={post.title || 'Blog post thumbnail'}
                    layout="fill"
                    objectFit="cover"
                    className="transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint="blog thumbnail"
                  />
                </Link>
              </CardHeader>
              <CardContent className="p-5 flex-grow">
                <CardTitle className="text-xl font-semibold mb-2 leading-tight hover:text-primary transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </CardTitle>
                 <p className="text-xs text-muted-foreground mb-3">
                  Published on {format(new Date(post.createdAt as Date), 'MMMM d, yyyy')}
                </p>
                <CardDescription className="text-sm text-muted-foreground line-clamp-3 mb-4">
                  {post.shortDescription}
                </CardDescription>
              </CardContent>
              <CardFooter className="p-5 border-t">
                <Button asChild variant="outline" className="w-full group">
                  <Link href={`/blog/${post.slug}`}>
                    Read More <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </section>
      )}

      {blogPostsData.hasMore && (
        <div className="text-center mt-12">
          <Button onClick={handleLoadMore} disabled={isLoadingMore} size="lg">
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading More...
              </>
            ) : (
              "Load More Posts"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
