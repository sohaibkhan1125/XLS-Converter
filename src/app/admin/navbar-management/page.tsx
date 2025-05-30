
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { NavbarSettings } from '@/types/navbar';
import { getNavbarSettings, updateNavbarSettings, uploadSiteLogo, deleteSiteLogo } from '@/lib/firebase-navbar-service';
import { auth } from '@/lib/firebase'; 
import { Trash2, UploadCloud, ImageOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';

export default function NavbarManagementPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<NavbarSettings>>({});
  const [initialSettings, setInitialSettings] = useState<Partial<NavbarSettings>>({}); // To compare for changes
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("NavbarManagementPage: Fetching settings. Admin UID:", auth.currentUser?.uid);
      const currentSettings = await getNavbarSettings();
      if (currentSettings) {
        setSettings(currentSettings);
        setInitialSettings(currentSettings); 
        if (currentSettings.logoUrl) {
          setLogoPreview(currentSettings.logoUrl);
        }
      } else {
        const defaultSettings = { siteTitle: 'XLSConvert', logoUrl: '' };
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
      }
    } catch (error) {
      console.error("Error fetching navbar settings:", error);
      toast({ variant: 'destructive', title: 'Error fetching settings', description: 'Could not load navbar settings.' });
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
    const currentSavedLogoUrl = initialSettings.logoUrl; // Use initial settings to check actual stored logo
    
    setIsSaving(true);
    try {
      if (currentSavedLogoUrl && currentSavedLogoUrl !== '') { 
        await deleteSiteLogo(currentSavedLogoUrl); 
      }
      
      await updateNavbarSettings({ logoUrl: '' }); 
      
      const newSettings = { ...settings, logoUrl: '' };
      setSettings(newSettings); 
      setInitialSettings(newSettings); // Update initial settings to reflect removal
      setLogoPreview(null); 
      setLogoFile(null); 

      toast({ title: 'Logo Removed', description: 'The site logo has been successfully removed.' });
    } catch (error) {
      console.error("Error removing logo:", error);
      const errorMessage = (error instanceof Error && (error as any).code) 
        ? `Firebase error: ${(error as any).message}` 
        : (error instanceof Error ? error.message : 'Could not remove the logo.');
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
    setIsSaving(true);
    
    let newLogoUrl = settings.logoUrl; // Start with current setting's logoUrl (could be from preview or old)

    try {
      if (logoFile) { // A new logo file has been selected
        // 1. Delete the old logo *from storage* if it exists and is different from current state
        // Use initialSettings.logoUrl to ensure we're deleting the actual one in storage
        if (initialSettings.logoUrl && initialSettings.logoUrl !== '') {
          try {
            await deleteSiteLogo(initialSettings.logoUrl);
            console.log("Old logo deleted successfully from storage during replacement.");
          } catch (delError: any) {
            console.warn("Could not delete old logo from storage during replacement:", delError.message);
            // If it's a critical error (not 'object-not-found'), we might want to stop and alert the user.
            // For now, we'll log and attempt to upload the new one.
            // If 'storage/object-not-found', it's fine.
            if (delError.code !== 'storage/object-not-found') {
                 toast({ variant: 'destructive', title: 'Old Logo Deletion Issue', description: `Could not remove previous logo: ${delError.message}. Proceeding with new upload.` });
            }
          }
        }
        // 2. Upload the new logo
        newLogoUrl = await uploadSiteLogo(logoFile);
        console.log("New logo uploaded successfully. URL:", newLogoUrl);
      }
      // If logoFile is null, newLogoUrl remains as settings.logoUrl (which might be empty if user cleared it but didn't save "Remove")

      const updatedSettingsData: Partial<NavbarSettings> = {
        siteTitle: settings.siteTitle || 'XLSConvert', 
        logoUrl: newLogoUrl || '', 
      };
      
      // 3. Update Firestore with the new siteTitle and potentially new logoUrl
      await updateNavbarSettings(updatedSettingsData);
      console.log("Firestore updated with settings:", updatedSettingsData);
      
      // 4. Update local component state to reflect successful save
      setSettings(prev => ({ ...prev, ...updatedSettingsData }));
      setInitialSettings(prev => ({ ...prev, ...updatedSettingsData })); // Update initial settings to match new saved state
      setLogoFile(null); // Clear the selected file input

      if (updatedSettingsData.logoUrl && updatedSettingsData.logoUrl !== '') {
        setLogoPreview(updatedSettingsData.logoUrl);
      } else {
        // If logo was removed or upload failed and newLogoUrl became empty
        setLogoPreview(null); 
      }

      toast({ title: 'Settings Saved', description: 'Navbar settings have been updated successfully.' });
    } catch (error: any) {
      console.error("Error saving settings in handleSubmit:", error);
      let description = 'Could not save navbar settings.';
      if (error.message) {
        description = error.message;
      }
      if (error.code) { // Firebase error code
        description = `Firebase error (${error.code}): ${error.message}`;
      }
      toast({ variant: 'destructive', title: 'Save Error', description });
    } finally {
      setIsSaving(false);
      console.log("handleSubmit finished, isSaving set to false.");
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Loading Navbar Settings..." /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Logo Management</CardTitle>
          <CardDescription>Upload or change your website logo. This will be displayed on the main site's navbar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUpload">Upload New Logo (Max 2MB, PNG/JPG/SVG recommended)</Label>
            <div className="flex items-center gap-4">
              <Input id="logoUpload" type="file" accept="image/png, image/jpeg, image/svg+xml" onChange={handleLogoChange} className="max-w-xs" disabled={isSaving} />
              {(logoPreview || (settings.logoUrl && settings.logoUrl !== '')) && ( 
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button" disabled={isSaving}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Current Logo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Logo Removal</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>
                      Are you sure you want to remove the current site logo? This will delete it from storage (if saved) and update the site.
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
              <Image src={logoPreview} alt="Logo Preview" width={150} height={50} className="object-contain rounded h-auto max-h-16" />
            </div>
          ) : (
             <div className="mt-4 p-4 border rounded-md inline-flex items-center justify-center bg-muted/20 shadow-sm h-20 w-40 text-muted-foreground">
                <ImageOff className="h-8 w-8" /> <span className="ml-2">No Logo</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Site Title</CardTitle>
          <CardDescription>Set the main title for your website that appears in the navbar next to the logo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="siteTitleInput" className="sr-only">Site Title</Label>
          <Input 
            id="siteTitleInput" 
            value={settings.siteTitle || ''} 
            onChange={handleSiteTitleChange} 
            placeholder="e.g., XLSConvert" 
            disabled={isSaving}
          />
        </CardContent>
      </Card>
      
      <div className="flex justify-end mt-8">
        <Button type="submit" size="lg" disabled={isSaving || isLoading}>
          {isSaving ? <LoadingSpinner message="Saving..." /> : 'Save Navbar Settings'}
        </Button>
      </div>
    </form>
  );
}
    

    