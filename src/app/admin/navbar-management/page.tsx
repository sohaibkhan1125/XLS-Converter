
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
import { Trash2, UploadCloud, ImageOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';

export default function NavbarManagementPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<NavbarSettings>>({});
  // initialSettings is not strictly necessary for this version since we are not comparing for changes before save.
  // const [initialSettings, setInitialSettings] = useState<Partial<NavbarSettings>>({}); 
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = await getNavbarSettings();
      if (currentSettings) {
        setSettings(currentSettings);
        // setInitialSettings(currentSettings);
        if (currentSettings.logoUrl) {
          setLogoPreview(currentSettings.logoUrl);
        }
      } else {
        const defaultSettings = { siteTitle: 'XLSConvert', logoUrl: '' }; // Default logoUrl to empty string
        setSettings(defaultSettings);
        // setInitialSettings(defaultSettings);
      }
    } catch (error) {
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
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = async () => {
    const currentSavedLogoUrl = settings.logoUrl; // The logo URL currently in Firestore (via local 'settings' state)
    
    setIsSaving(true);
    try {
      // If there's a logo URL from Firestore (or local state that originated from Firestore)
      // and it's not already an empty string.
      if (currentSavedLogoUrl && currentSavedLogoUrl !== '') { 
        await deleteSiteLogo(currentSavedLogoUrl); // Delete from storage
      }
      
      // Always update Firestore to set logoUrl to empty string, indicating no logo
      await updateNavbarSettings({ logoUrl: '' }); 
      
      // Update local state to reflect removal
      setSettings(prev => ({ ...prev, logoUrl: '' })); // Set local logoUrl to empty string
      setLogoPreview(null); // Clear preview
      setLogoFile(null); // Clear any pending local file selection

      toast({ title: 'Logo Removed', description: 'The site logo has been successfully removed.' });
    } catch (error) {
      console.error("Error removing logo:", error);
      toast({ variant: 'destructive', title: 'Error Removing Logo', description: 'Could not remove the logo.' });
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
    
    let newLogoUrl = settings.logoUrl; // Start with current logo URL from state (could be '' or an actual URL)

    try {
      if (logoFile) { // If a new logo file was selected for upload
        // If there was an old logo URL stored (and it's not an empty string), delete it from storage
        if (settings.logoUrl && settings.logoUrl !== '') {
          try {
            await deleteSiteLogo(settings.logoUrl);
          } catch (delError) {
            console.warn("Could not delete old logo during replacement:", delError);
            // Continue with uploading the new logo even if old one fails to delete
          }
        }
        newLogoUrl = await uploadSiteLogo(logoFile); // Upload new logo and get its URL
      }
      // If logoFile is null, newLogoUrl retains its value from settings.logoUrl 
      // (which could be an existing URL if not changed, or '' if it was removed).

      const updatedSettingsData: Partial<NavbarSettings> = {
        siteTitle: settings.siteTitle || '', 
        logoUrl: newLogoUrl || '', // Ensure logoUrl is a string (URL or empty), never undefined
      };
      
      await updateNavbarSettings(updatedSettingsData);
      
      // Update local state to reflect the saved state
      setSettings(prev => ({ ...prev, ...updatedSettingsData }));
      // setInitialSettings(prev => ({ ...prev, ...updatedSettingsData })); // If using initialSettings
      setLogoFile(null); // Clear the file input after successful upload or save

      // Update logoPreview based on the actually saved logoUrl
      if (updatedSettingsData.logoUrl && updatedSettingsData.logoUrl !== '') {
        setLogoPreview(updatedSettingsData.logoUrl);
      } else {
        setLogoPreview(null); // If logoUrl is empty string or null, clear preview
      }

      toast({ title: 'Settings Saved', description: 'Navbar settings have been updated successfully.' });
    } catch (error) {
      console.error("Error saving settings:", error);
      // Check if error is a FirebaseError and has a message
      const errorMessage = (error instanceof Error && (error as any).code) 
        ? `Firebase error: ${(error as any).message}` 
        : (error instanceof Error ? error.message : 'Could not save navbar settings.');
      toast({ variant: 'destructive', title: 'Save Error', description: errorMessage });
    } finally {
      setIsSaving(false);
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
            <Label htmlFor="logoUpload">Upload New Logo</Label>
            <div className="flex items-center gap-4">
              <Input id="logoUpload" type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" disabled={isSaving} />
              {/* Show remove button if there's any logo (saved or pending local selection) */}
              {(logoPreview || logoFile || (settings.logoUrl && settings.logoUrl !== '')) && ( 
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button" disabled={isSaving}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Logo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Removal</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>
                      { (settings.logoUrl && settings.logoUrl !== '') ? "Are you sure you want to remove the current site logo? This will delete it from storage and update the site." : "Are you sure you want to clear the selected logo?"}
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRemoveLogo} className="bg-destructive hover:bg-destructive/90">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
             <p className="text-xs text-muted-foreground">Recommended: PNG, JPG, SVG. Max 2MB.</p>
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
    
