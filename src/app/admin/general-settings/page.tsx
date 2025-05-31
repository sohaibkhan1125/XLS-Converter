
"use client";

import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react'; // Import all icons
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { GeneralSiteSettings, SocialLink } from '@/types/site-settings';
import { 
  getGeneralSettings, 
  updateGeneralSettings, 
  uploadSharedSiteLogo, 
  deleteSharedSiteLogo,
  PREDEFINED_SOCIAL_MEDIA_PLATFORMS
} from '@/lib/firebase-settings-service';
import { Trash2, ImageOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';

const DEFAULT_SITE_TITLE = "XLSConvert";

export default function GeneralSettingsPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<GeneralSiteSettings>>({
    siteTitle: DEFAULT_SITE_TITLE,
    logoUrl: '',
    socialLinks: PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p => ({ ...p, url: '', enabled: false })),
  });
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
        // Ensure socialLinks are merged correctly
        const mergedSocialLinks = PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p_defined => {
          const savedLink = currentSettings.socialLinks?.find(sl => sl.id === p_defined.id);
          return savedLink ? { ...p_defined, ...savedLink } : { ...p_defined, url: '', enabled: false };
        });

        const newSettings = {
          ...currentSettings,
          socialLinks: mergedSocialLinks
        };
        setSettings(newSettings);
        setInitialSettings(newSettings); 
        if (currentSettings.logoUrl) {
          setLogoPreview(currentSettings.logoUrl);
        }
      } else {
        const defaultSettingsWithSocial: Partial<GeneralSiteSettings> = { 
          siteTitle: DEFAULT_SITE_TITLE, 
          logoUrl: '', 
          adLoaderScript: '', 
          navItems: [],
          socialLinks: PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p => ({ ...p, url: '', enabled: false }))
        };
        setSettings(defaultSettingsWithSocial);
        setInitialSettings(defaultSettingsWithSocial);
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
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveLogo = async () => {
    const currentSavedLogoUrl = initialSettings.logoUrl;
    setIsSaving(true);
    try {
      if (currentSavedLogoUrl && currentSavedLogoUrl !== '') { 
        await deleteSharedSiteLogo(currentSavedLogoUrl); 
      }
      const firestoreUpdateData: Partial<GeneralSiteSettings> = { 
        ...initialSettings, // Preserve all other initial settings
        logoUrl: '', 
      };
      await updateGeneralSettings(firestoreUpdateData); 
      
      setSettings(prev => ({ ...prev, logoUrl: '' })); 
      setInitialSettings(prev => ({ ...prev, logoUrl: '' }));
      setLogoPreview(null); 
      setLogoFile(null); 
      toast({ title: 'Site Logo Removed', description: 'The site logo has been successfully removed.' });
    } catch (error: any) {
      console.error("Error removing site logo:", error);
      toast({ variant: 'destructive', title: 'Error Removing Logo', description: error.message || 'Could not remove the site logo.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSiteTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, siteTitle: e.target.value }));
  };

  const handleSocialLinkChange = (id: string, field: 'url' | 'enabled', value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      socialLinks: (prev.socialLinks || []).map(link => 
        link.id === id ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    let newLogoUrlIfUploaded: string | undefined = initialSettings.logoUrl; // Default to existing if no change

    try {
      if (logoFile) { // A new logo file was selected
        if (initialSettings.logoUrl && initialSettings.logoUrl !== '') {
          try {
            await deleteSharedSiteLogo(initialSettings.logoUrl);
          } catch (delError: any) {
             if (delError.code !== 'storage/object-not-found') {
                console.warn("Old logo deletion issue (non-fatal):", delError);
             }
          }
        }
        newLogoUrlIfUploaded = await uploadSharedSiteLogo(logoFile);
      }
      // If logoFile is null, newLogoUrlIfUploaded retains initialSettings.logoUrl
      // If logo was explicitly removed via handleRemoveLogo, settings.logoUrl would be '',
      // but handleSubmit gets triggered after that, so newLogoUrlIfUploaded needs to be set to settings.logoUrl
      // if no new file is chosen.
      else if (settings.logoUrl === '' && initialSettings.logoUrl !== '') { // Logo was removed but no new one selected for this save
         newLogoUrlIfUploaded = '';
      }


      const settingsToUpdate: Partial<GeneralSiteSettings> = {
        ...initialSettings, // Start with the last saved state to preserve fields not on this form (e.g., navItems)
        siteTitle: settings.siteTitle || DEFAULT_SITE_TITLE,
        logoUrl: newLogoUrlIfUploaded,
        socialLinks: settings.socialLinks || [],
        // adLoaderScript is managed on its own page but part of the same doc, preserve it
        adLoaderScript: initialSettings.adLoaderScript 
      };

      await updateGeneralSettings(settingsToUpdate);
      setInitialSettings(settingsToUpdate);
      setSettings(settingsToUpdate); // Sync current form state
      setLogoFile(null); 
      if (settingsToUpdate.logoUrl && settingsToUpdate.logoUrl !== '') {
        setLogoPreview(settingsToUpdate.logoUrl);
      } else {
        setLogoPreview(null);
      }
      toast({ title: 'General Settings Saved', description: 'Site settings have been updated successfully.' });
    } catch (error: any) {
      console.error("Error during save process:", error);
      toast({ variant: 'destructive', title: 'Save Error', description: error.message || 'Could not save settings.' });
    } finally {
      setIsSaving(false);
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
              <Input id="logoUpload" type="file" accept="image/png, image/jpeg, image/svg+xml, image/webp" onChange={handleLogoChange} className="max-w-xs" disabled={isSaving} key={logoFile ? 'file-selected' : 'no-file'} />
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
                      Are you sure you want to remove the current site logo? This action takes effect on the next save.
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => {
                        setLogoFile(null);
                        setLogoPreview(null);
                        setSettings(prev => ({ ...prev, logoUrl: '' }));
                        // No direct save here, removal happens on main form submit
                      }} className="bg-destructive hover:bg-destructive/90">Confirm Removal</AlertDialogAction>
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

      <Card>
        <CardHeader>
          <CardTitle>Social Media Links</CardTitle>
          <CardDescription>Manage links to your social media profiles. Enabled links will appear in the footer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(settings.socialLinks || []).map(link => {
            // @ts-ignore - LucideIcons is an object, not a type here, using string index
            const IconComponent = LucideIcons[link.iconName] as LucideIcons.LucideIcon | undefined || LucideIcons.Link2;
            return (
              <div key={link.id} className="space-y-3 p-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-6 w-6 text-muted-foreground" />
                    <Label htmlFor={`social-url-${link.id}`} className="text-lg font-medium">{link.name}</Label>
                  </div>
                  <Switch
                    id={`social-enabled-${link.id}`}
                    checked={link.enabled}
                    onCheckedChange={(checked) => handleSocialLinkChange(link.id, 'enabled', checked)}
                    disabled={isSaving}
                  />
                </div>
                {link.enabled && (
                  <div className="pl-8 space-y-1">
                    <Label htmlFor={`social-url-${link.id}`} className="text-xs text-muted-foreground">URL</Label>
                    <Input
                      id={`social-url-${link.id}`}
                      type="url"
                      placeholder={`https://${link.id.toLowerCase()}.com/yourpage`}
                      value={link.url}
                      onChange={(e) => handleSocialLinkChange(link.id, 'url', e.target.value)}
                      disabled={isSaving || !link.enabled}
                      className="text-sm"
                    />
                  </div>
                )}
              </div>
            );
          })}
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
