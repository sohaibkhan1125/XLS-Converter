
"use client";

import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { GeneralSiteSettings } from '@/types/site-settings';
import { 
  getGeneralSettings, 
  updateGeneralSettings, 
  uploadSharedSiteLogo, 
  deleteSharedSiteLogo 
} from '@/lib/firebase-settings-service';
import { Trash2, ImageOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';

const DEFAULT_SITE_TITLE = "XLSConvert";

export default function GeneralSettingsPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<GeneralSiteSettings>>({});
  const [initialSettings, setInitialSettings] = useState<Partial<GeneralSiteSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = await getGeneralSettings();
      if (currentSettings) {
        setSettings(currentSettings);
        setInitialSettings(currentSettings); 
        if (currentSettings.logoUrl) {
          setLogoPreview(currentSettings.logoUrl);
        }
      } else {
        const defaultSettings: Partial<GeneralSiteSettings> = { siteTitle: DEFAULT_SITE_TITLE, logoUrl: '' };
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching general settings:", error);
      toast({ variant: 'destructive', title: 'Error fetching settings', description: 'Could not load general site settings.' });
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
      setLogoPreview(URL.createObjectURL(file)); // Show local preview
      // Do not update settings.logoUrl here, only on successful save
    }
  };

  const handleRemoveLogo = async () => {
    const currentSavedLogoUrl = initialSettings.logoUrl; // Use the one actually saved
    
    setIsSaving(true);
    try {
      if (currentSavedLogoUrl && currentSavedLogoUrl !== '') { 
        await deleteSharedSiteLogo(currentSavedLogoUrl); 
      }
      
      // Data to update in Firestore (only logoUrl changes here, others preserved)
      const firestoreUpdateData: Partial<GeneralSiteSettings> = { 
        logoUrl: '', 
        siteTitle: initialSettings.siteTitle || DEFAULT_SITE_TITLE, // Preserve from last saved state
        adLoaderScript: initialSettings.adLoaderScript, // Preserve
        navItems: initialSettings.navItems // Preserve
      };
      await updateGeneralSettings(firestoreUpdateData); 
      
      // Update local states to reflect successful removal
      setSettings(prev => ({ ...prev, logoUrl: '' })); 
      setInitialSettings(prev => ({ ...prev, logoUrl: '' })); // Reflect removal in initial settings
      setLogoPreview(null); 
      setLogoFile(null); 

      toast({ title: 'Site Logo Removed', description: 'The site logo has been successfully removed.' });
    } catch (error: any) {
      console.error("Error removing site logo:", error);
      const errorMessage = error.message || 'Could not remove the site logo.';
      toast({ variant: 'destructive', title: 'Error Removing Logo', description: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSiteTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, siteTitle: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    let newLogoUrlIfUploaded: string | undefined = undefined;

    try {
      // Step 1: If a new logo file is provided, try to delete the old one (if it existed in initialSettings)
      if (logoFile && initialSettings.logoUrl && initialSettings.logoUrl !== '') {
        try {
          await deleteSharedSiteLogo(initialSettings.logoUrl);
        } catch (delError: any) {
          if (delError.code !== 'storage/object-not-found') {
            console.warn("Old logo deletion issue (non-fatal):", delError);
            toast({ variant: 'destructive', title: 'Old Logo Deletion Issue', description: `Could not remove previous logo: ${delError.message}. Proceeding.` });
          }
        }
      }

      // Step 2: If a new logo file is provided, upload it. This will throw on critical failure.
      if (logoFile) {
        newLogoUrlIfUploaded = await uploadSharedSiteLogo(logoFile);
      }

      // Step 3: Determine the final logoUrl for Firestore
      // - If a new logo was uploaded successfully, use its URL.
      // - Else, if no new file was selected, settings.logoUrl reflects either the existing URL or '' if "Remove Logo" was clicked.
      const finalLogoUrlForFirestore = newLogoUrlIfUploaded !== undefined
        ? newLogoUrlIfUploaded
        : settings.logoUrl; // settings.logoUrl will be '' if removed, or initialSettings.logoUrl if unchanged

      // Step 4: Prepare data for Firestore update
      const settingsToUpdate: Partial<GeneralSiteSettings> = {
        siteTitle: settings.siteTitle || DEFAULT_SITE_TITLE,
        logoUrl: finalLogoUrlForFirestore,
        adLoaderScript: initialSettings.adLoaderScript, // Preserve from last known saved state
        navItems: initialSettings.navItems,             // Preserve from last known saved state
      };

      // Step 5: Update Firestore
      await updateGeneralSettings(settingsToUpdate);

      // Step 6: Update local state to reflect successful save
      setInitialSettings(settingsToUpdate); // Sync initialSettings with exactly what was saved
      setSettings(settingsToUpdate);        // Sync current form state as well
      
      setLogoFile(null); // Clear the selected file input

      // Update preview based on what was actually saved to Firestore
      if (settingsToUpdate.logoUrl && settingsToUpdate.logoUrl !== '') {
        setLogoPreview(settingsToUpdate.logoUrl);
      } else {
        setLogoPreview(null);
      }

      toast({ title: 'General Settings Saved', description: 'Site settings have been updated successfully.' });

    } catch (error: any) { // This catches errors from uploadSharedSiteLogo (if new file) or updateGeneralSettings
      console.error("Error during save process:", error);
      toast({ variant: 'destructive', title: 'Save Error', description: error.message || 'Could not save settings.' });
      // If upload failed, newLogoUrlIfUploaded would be undefined.
      // The settings state (title, logoUrl) might be partially updated from user actions.
      // We don't revert them here, user can retry or correct.
      // The preview might still show the local blob if upload failed; user might need to re-select or remove.
    } finally {
      setIsSaving(false); // Crucial: ensure this always runs
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Loading General Settings..." /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Site Title & Logo</CardTitle>
          <CardDescription>Manage the main title and logo for your website. These will be used in the header and footer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="siteTitleInput">Site Title</Label>
            <Input 
              id="siteTitleInput" 
              value={settings.siteTitle || ''} 
              onChange={handleSiteTitleChange} 
              placeholder="e.g., XLSConvert Inc." 
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="logoUpload">Site Logo (Max 2MB, PNG/JPG/SVG recommended)</Label>
            <div className="flex items-center gap-4">
              <Input id="logoUpload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} className="max-w-xs" disabled={isSaving} key={logoFile ? 'file-selected' : 'no-file'} />
              {(logoPreview || (initialSettings.logoUrl && initialSettings.logoUrl !== '')) && ( 
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button" disabled={isSaving}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Current Logo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Logo Removal</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>
                      Are you sure you want to remove the current site logo? This will save immediately.
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
              <Image src={logoPreview} alt="Site Logo Preview" width={150} height={50} className="object-contain rounded h-auto max-h-16" data-ai-hint="logo"/>
            </div>
          ) : (
             <div className="mt-4 p-4 border rounded-md inline-flex items-center justify-center bg-muted/20 shadow-sm h-20 w-40 text-muted-foreground">
                <ImageOff className="h-8 w-8" /> <span className="ml-2">No Site Logo</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-end mt-8">
        <Button type="submit" size="lg" disabled={isSaving || isLoading}>
          {isSaving ? <LoadingSpinner message="Saving..." /> : 'Save General Settings'}
        </Button>
      </div>
    </form>
  );
}
