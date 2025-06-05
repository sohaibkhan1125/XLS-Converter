
"use client";

import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import dynamic from 'next/dynamic'; // For client-side only ReactQuill
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/core/loading-spinner';
import { slugify } from '@/lib/utils';
import { createBlogPost, updateBlogPost, uploadBlogThumbnail, checkSlugExists } from '@/lib/firebase-blog-service';
import type { BlogPost, BlogPostStatus } from '@/types/blog';
import 'react-quill/dist/quill.snow.css'; // Import Quill styles
import { AlertCircle, CheckCircle, UploadCloud, XCircle } from 'lucide-react';

// Dynamically import ReactQuill to ensure it's only loaded client-side
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const blogPostSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters long." }).max(150),
  shortDescription: z.string().min(10, { message: "Short description must be at least 10 characters." }).max(300),
  slug: z.string().min(3, { message: "Slug is required." }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, with hyphens."),
  content: z.string().min(50, { message: "Content must be at least 50 characters long." }),
  status: z.enum(['draft', 'published']),
});

type BlogPostFormValues = z.infer<typeof blogPostSchema>;

interface BlogPostFormProps {
  existingPost?: BlogPost | null;
}

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link', 'image', 'video'], // Added video
    ['blockquote', 'code-block'],
    [{ 'script': 'sub'}, { 'script': 'super' }],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ],
};

export default function BlogPostForm({ existingPost }: BlogPostFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(existingPost?.thumbnailImageUrl || null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const { control, register, handleSubmit, watch, setValue, getValues, formState: { errors, isDirty } } = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: existingPost?.title || '',
      shortDescription: existingPost?.shortDescription || '',
      slug: existingPost?.slug || '',
      content: existingPost?.content || '',
      status: existingPost?.status || 'draft',
    },
  });

  const watchedTitle = watch('title');
  const watchedSlug = watch('slug');

  // Auto-generate slug from title if not manually edited
  useEffect(() => {
    if (watchedTitle && !slugManuallyEdited && !existingPost) { // Only for new posts or if slug wasn't set
      const newSlug = slugify(watchedTitle);
      setValue('slug', newSlug, { shouldValidate: true, shouldDirty: true });
    }
  }, [watchedTitle, slugManuallyEdited, setValue, existingPost]);
  
  // Debounced slug check
  const debouncedCheckSlug = useCallback(
    debounce(async (slugToTest: string) => {
      if (!slugToTest) {
        setSlugAvailable(null);
        return;
      }
      const isTaken = await checkSlugExists(slugToTest, existingPost?.id);
      setSlugAvailable(!isTaken);
    }, 500),
    [existingPost?.id] 
  );

  useEffect(() => {
    if (watchedSlug) {
      debouncedCheckSlug(watchedSlug);
    }
  }, [watchedSlug, debouncedCheckSlug]);


  const handleThumbnailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    // If editing, this implies the existing thumbnail might be removed on save
  };

  const onSubmitHandler: SubmitHandler<BlogPostFormValues> = async (data, event) => {
    const clickedButton = event?.nativeEvent.submitter;
    const statusToSet = clickedButton?.id === 'publish-button' ? 'published' : 'draft';
    
    setIsLoading(true);

    if (!data.slug || (slugAvailable === false && data.slug !== existingPost?.slug)) {
      toast({ variant: "destructive", title: "Slug Error", description: "Please provide a unique and valid slug." });
      setIsLoading(false);
      return;
    }
    
    try {
      let thumbnailUrl = existingPost?.thumbnailImageUrl || null;
      if (thumbnailFile) {
        setIsUploading(true);
        thumbnailUrl = await uploadBlogThumbnail(thumbnailFile, existingPost?.id);
        setIsUploading(false);
      } else if (!thumbnailPreview && existingPost?.thumbnailImageUrl) {
        // If preview was removed and there was an existing image, it means user wants to remove it.
        thumbnailUrl = null; 
      }

      const postDataToSave = {
        ...data,
        status: statusToSet,
        content: data.content, // Ensure content from ReactQuill is used
        thumbnailImageUrl: thumbnailUrl,
      };
      
      if (existingPost?.id) {
        await updateBlogPost(existingPost.id, postDataToSave, data.slug);
        toast({ title: "Blog Post Updated", description: `"${data.title}" has been successfully updated.` });
      } else {
        const newPostId = await createBlogPost(postDataToSave, data.slug);
        toast({ title: "Blog Post Created", description: `"${data.title}" has been successfully created.` });
      }
      router.push('/admin/blog-manager');
      router.refresh(); // To update the list on the manager page
    } catch (error: any) {
      console.error("Error saving blog post:", error);
      toast({ variant: "destructive", title: "Save Error", description: error.message || "Could not save the blog post." });
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="Enter blog post title" disabled={isLoading} />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <div className="flex items-center gap-2">
              <Input 
                id="slug" 
                {...register('slug')} 
                placeholder="e.g., my-awesome-post" 
                disabled={isLoading}
                onChange={(e) => {
                  setValue('slug', slugify(e.target.value), { shouldValidate: true });
                  setSlugManuallyEdited(true);
                }}
              />
              {slugAvailable === true && <CheckCircle className="h-5 w-5 text-green-500" />}
              {slugAvailable === false && watchedSlug !== existingPost?.slug && <AlertCircle className="h-5 w-5 text-destructive" />}
            </div>
            {errors.slug && <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>}
            {slugAvailable === false && watchedSlug !== existingPost?.slug && <p className="text-sm text-destructive mt-1">This slug is already taken. Please choose another.</p>}
             <p className="text-xs text-muted-foreground mt-1">URL-friendly version of the title. Auto-generated, but can be customized.</p>
          </div>

          <div>
            <Label htmlFor="shortDescription">Short Description (Max 300 chars)</Label>
            <Textarea 
              id="shortDescription" 
              {...register('shortDescription')} 
              placeholder="A brief summary for previews..." 
              rows={3} 
              maxLength={300}
              disabled={isLoading} 
            />
            {errors.shortDescription && <p className="text-sm text-destructive mt-1">{errors.shortDescription.message}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thumbnail Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {thumbnailPreview ? (
              <div className="relative w-32 h-32 rounded-md overflow-hidden border">
                <Image src={thumbnailPreview} alt="Thumbnail preview" layout="fill" objectFit="cover" data-ai-hint="blog thumbnail" />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-md border border-dashed flex items-center justify-center bg-muted/50">
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="space-y-2">
              <Input 
                id="thumbnailImage" 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleThumbnailChange} 
                className="max-w-xs"
                disabled={isLoading || isUploading}
              />
              {thumbnailPreview && (
                <Button type="button" variant="outline" size="sm" onClick={removeThumbnail} disabled={isLoading || isUploading}>
                  <XCircle className="mr-2 h-4 w-4" />Remove Thumbnail
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Recommended size: 800x400px. Max 2MB.</p>
            </div>
          </div>
          {isUploading && <LoadingSpinner message="Uploading thumbnail..." />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Main Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <ReactQuill
                theme="snow"
                value={field.value}
                onChange={field.onChange}
                modules={quillModules}
                placeholder="Write your amazing blog post here..."
                className={isLoading ? 'opacity-50 pointer-events-none' : ''}
              />
            )}
          />
          {errors.content && <p className="text-sm text-destructive mt-2">{errors.content.message}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status & Actions</CardTitle>
        </CardHeader>
        <CardContent>
           <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Set status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && <p className="text-sm text-destructive mt-1">{errors.status.message}</p>}
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t pt-6">
          <Button type="button" variant="outline" onClick={() => router.push('/admin/blog-manager')} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            id="save-draft-button"
            variant="secondary" 
            disabled={isLoading || isUploading || (slugAvailable === false && watch('slug') !== existingPost?.slug)}
          >
            {isLoading ? <LoadingSpinner message="Saving..." /> : 'Save Draft'}
          </Button>
          <Button 
            type="submit"
            id="publish-button"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={isLoading || isUploading || (slugAvailable === false && watch('slug') !== existingPost?.slug)}
          >
            {isLoading ? <LoadingSpinner message="Publishing..." /> : (existingPost?.status === 'published' ? 'Update Published Post' : 'Publish')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

// Debounce helper function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced as (...args: Parameters<F>) => ReturnType<F>;
}

