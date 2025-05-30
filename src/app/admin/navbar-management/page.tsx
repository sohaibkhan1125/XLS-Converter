
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { NavbarSettings } from '@/types/navbar'; // NavItem will no longer be used here
import { getNavbarSettings, updateNavbarSettings, uploadSiteLogo, deleteSiteLogo } from '@/lib/firebase-navbar-service';
import { Trash2, UploadCloud, ImageOff } from 'lucide-react'; // Removed Edit3, PlusCircle
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';

export default function NavbarManagementPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<NavbarSettings>>({});
  const [initialSettings, setInitialSettings] = useState<Partial<NavbarSettings>>({}); // To compare if actual changes were made, though not strictly necessary for this simplified version
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
        setInitialSettings(currentSettings);
        if (currentSettings.logoUrl) {
          setLogoPreview(currentSettings.logoUrl);
        }
      } else {
        // Initialize with defaults if no settings found
        const defaultSettings = { siteTitle: 'XLSConvert', logoUrl: undefined };
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
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
    if (settings.logoUrl) { // If there's a logo URL from Firestore
      setIsSaving(true);
      try {
        await deleteSiteLogo(settings.logoUrl); // Delete from storage
        const newSettings = { ...settings, logoUrl: undefined };
        await updateNavbarSettings({ logoUrl: '' }); // Update Firestore to remove URL
        setSettings(newSettings);
        setLogoPreview(null);
        setLogoFile(null); // Clear any pending local file
        toast({ title: 'Logo Removed', description: 'The site logo has been removed.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error Removing Logo', description: 'Could not remove the logo.' });
      } finally {
        setIsSaving(false);
      }
    } else if (logoFile || logoPreview) { // Only a local preview/file exists, not yet saved
        setLogoFile(null);
        setLogoPreview(null);
        toast({ title: 'Local Logo Cleared', description: 'The selected logo has been cleared.' });
    }
  };

  const handleSiteTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, siteTitle: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let newLogoUrl = settings.logoUrl; // Start with current (possibly undefined)

    try {
      if (logoFile) { // If a new logo file was selected
        // If there was an old logo URL from Firestore and it's different from the one we are about to upload
        // (This check is a bit complex if the old logo was just a local preview that was cleared.
        // Simpler: just delete if settings.logoUrl exists and we're uploading a new one.)
        if (settings.logoUrl) {
          try {
            await deleteSiteLogo(settings.logoUrl);
          } catch (delError) {
            console.warn("Could not delete old logo during replacement:", delError);
          }
        }
        newLogoUrl = await uploadSiteLogo(logoFile); // Upload new logo
      }
      // If logoFile is null, newLogoUrl retains its value from settings.logoUrl (or undefined if it was removed)
      
      const updatedSettingsData: Partial<NavbarSettings> = {
        siteTitle: settings.siteTitle || '', // Ensure siteTitle is not undefined
        logoUrl: newLogoUrl, 
        // navItems are no longer managed here, so they won't be part of the update.
        // Firestore merge: true will keep existing navItems if any.
      };
      
      await updateNavbarSettings(updatedSettingsData);
      
      // Update local state to reflect the saved state
      setSettings(prev => ({ ...prev, ...updatedSettingsData }));
      setInitialSettings(prev => ({ ...prev, ...updatedSettingsData }));
      setLogoFile(null); // Clear the file input after successful upload
      if (newLogoUrl) {
        setLogoPreview(newLogoUrl); // Update preview to the new URL from storage
      } else if (!logoFile && !settings.logoUrl && !newLogoUrl) { 
        // Handles case where logo was removed and saved
        setLogoPreview(null);
      }


      toast({ title: 'Settings Saved', description: 'Navbar settings have been updated successfully.' });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save navbar settings.' });
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
              {(logoPreview || logoFile) && ( // Show remove button if there's any logo (saved or pending)
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button" disabled={isSaving}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Logo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Removal</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>
                      {settings.logoUrl ? "Are you sure you want to remove the current site logo? This will delete it from storage." : "Are you sure you want to clear the selected logo?"}
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
    