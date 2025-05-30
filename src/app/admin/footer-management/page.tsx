
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { FooterSettings } from '@/types/footer';
import { getFooterSettings, updateFooterSettings, uploadFooterLogo, deleteFooterLogo } from '@/lib/firebase-footer-service';
import { Trash2, ImageOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';

export default function FooterManagementPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<FooterSettings>>({});
  const [initialSettings, setInitialSettings] = useState<Partial<FooterSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = await getFooterSettings();
      if (currentSettings) {
        setSettings(currentSettings);
        setInitialSettings(currentSettings); 
        if (currentSettings.footerLogoUrl) {
          setLogoPreview(currentSettings.footerLogoUrl);
        }
      } else {
        const defaultSettings = { footerSiteTitle: 'XLSConvert', footerLogoUrl: '' };
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching footer settings:", error);
      toast({ variant: 'destructive', title: 'Error fetching settings', description: 'Could not load footer settings.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: 'destructive', title: 'File Too Large', description: 'Logo image should be less than 2MB.' });
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = async () => {
    const currentSavedLogoUrl = initialSettings.footerLogoUrl;
    
    setIsSaving(true);
    try {
      if (currentSavedLogoUrl && currentSavedLogoUrl !== '') { 
        await deleteFooterLogo(currentSavedLogoUrl); 
      }
      
      await updateFooterSettings({ footerLogoUrl: '' }); 
      
      const newSettings = { ...settings, footerLogoUrl: '' };
      setSettings(newSettings); 
      setInitialSettings(newSettings);
      setLogoPreview(null); 
      setLogoFile(null); 

      toast({ title: 'Footer Logo Removed', description: 'The site footer logo has been successfully removed.' });
    } catch (error: any) {
      console.error("Error removing footer logo:", error);
      const errorMessage = error.message || 'Could not remove the footer logo.';
      toast({ variant: 'destructive', title: 'Error Removing Logo', description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSiteTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, footerSiteTitle: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    
    let newLogoUrl = settings.footerLogoUrl;

    try {
      if (logoFile) {
        if (initialSettings.footerLogoUrl && initialSettings.footerLogoUrl !== '') {
          try {
            await deleteFooterLogo(initialSettings.footerLogoUrl);
          } catch (delError: any) {
            if (delError.code !== 'storage/object-not-found') {
                 toast({ variant: 'destructive', title: 'Old Footer Logo Deletion Issue', description: `Could not remove previous footer logo: ${delError.message}. Proceeding with new upload.` });
            }
          }
        }
        newLogoUrl = await uploadFooterLogo(logoFile);
      }

      const updatedSettingsData: Partial<FooterSettings> = {
        footerSiteTitle: settings.footerSiteTitle || 'XLSConvert', 
        footerLogoUrl: newLogoUrl || '', 
      };
      
      await updateFooterSettings(updatedSettingsData);
      
      setSettings(prev => ({ ...prev, ...updatedSettingsData }));
      setInitialSettings(prev => ({ ...prev, ...updatedSettingsData }));
      setLogoFile(null);

      if (updatedSettingsData.footerLogoUrl && updatedSettingsData.footerLogoUrl !== '') {
        setLogoPreview(updatedSettingsData.footerLogoUrl);
      } else {
        setLogoPreview(null); 
      }

      toast({ title: 'Footer Settings Saved', description: 'Footer settings have been updated successfully.' });
    } catch (error: any) {
      console.error("Error saving footer settings in handleSubmit:", error);
      let description = 'Could not save footer settings.';
      if (error.message) description = error.message;
      toast({ variant: 'destructive', title: 'Save Error', description });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Loading Footer Settings..." /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Footer Logo Management</CardTitle>
          <CardDescription>Upload or change your website footer logo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUpload">Upload New Footer Logo (Max 2MB, PNG/JPG/SVG recommended)</Label>
            <div className="flex items-center gap-4">
              <Input id="logoUpload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} className="max-w-xs" disabled={isSaving} />
              {(logoPreview || (settings.footerLogoUrl && settings.footerLogoUrl !== '')) && ( 
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button" disabled={isSaving}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Current Footer Logo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Footer Logo Removal</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>
                      Are you sure you want to remove the current site footer logo?
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveLogo} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
          {logoPreview ? (
            <div className="mt-4 p-2 border rounded-md inline-block bg-muted/20 shadow-sm">
              <Image src={logoPreview} alt="Footer Logo Preview" width={150} height={50} className="object-contain rounded h-auto max-h-16" data-ai-hint="logo"/>
            </div>
          ) : (
             <div className="mt-4 p-4 border rounded-md inline-flex items-center justify-center bg-muted/20 shadow-sm h-20 w-40 text-muted-foreground">
                <ImageOff className="h-8 w-8" /> <span className="ml-2">No Footer Logo</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Footer Site Title</CardTitle>
          <CardDescription>Set the site title that appears in the footer.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="footerSiteTitleInput" className="sr-only">Footer Site Title</Label>
          <Input 
            id="footerSiteTitleInput" 
            value={settings.footerSiteTitle || ''} 
            onChange={handleSiteTitleChange} 
            placeholder="e.g., XLSConvert Inc." 
            disabled={isSaving}
          />
        </CardContent>
      </Card>
      
      <div className="flex justify-end mt-8">
        <Button type="submit" size="lg" disabled={isSaving || isLoading}>
          {isSaving ? <LoadingSpinner message="Saving..." /> : 'Save Footer Settings'}
        </Button>
      </div>
    </form>
  );
}
