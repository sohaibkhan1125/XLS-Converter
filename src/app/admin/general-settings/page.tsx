
"use client";

import { useState, useEffect, useCallback, type ChangeEvent, type FormEvent } from 'react';
import Image from 'next/image';
import * as LucideIcons from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { GeneralSiteSettings, SocialLink, CustomScript } from '@/types/site-settings';
import { 
  getGeneralSettings, 
  updateGeneralSettings, 
  uploadSharedSiteLogo, 
  deleteSharedSiteLogo,
  PREDEFINED_SOCIAL_MEDIA_PLATFORMS
} from '@/lib/firebase-settings-service';
import { Trash2, ImageOff, PlusCircle, XCircle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_SITE_TITLE = "XLSConvert";

export default function GeneralSettingsPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<GeneralSiteSettings>>({
    siteTitle: DEFAULT_SITE_TITLE,
    logoUrl: '',
    socialLinks: PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p => ({ ...p, url: '', enabled: false })),
    customScripts: [],
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
        const mergedSocialLinks = PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p_defined => {
          const savedLink = currentSettings.socialLinks?.find(sl => sl.id === p_defined.id);
          return savedLink ? { ...p_defined, ...savedLink } : { ...p_defined, url: '', enabled: false };
        });

        const newSettings = {
          ...currentSettings,
          socialLinks: mergedSocialLinks,
          customScripts: currentSettings.customScripts || [], // Ensure customScripts is an array
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
          socialLinks: PREDEFINED_SOCIAL_MEDIA_PLATFORMS.map(p => ({ ...p, url: '', enabled: false })),
          customScripts: []
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
      if (file.size > 2 * 1024 * 1024) { 
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
        ...initialSettings, 
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

  const handleCustomScriptChange = (id: string, field: keyof CustomScript, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      customScripts: (prev.customScripts || []).map(script =>
        script.id === id ? { ...script, [field]: value } : script
      ),
    }));
  };

  const handleAddCustomScript = () => {
    const newScript: CustomScript = {
      id: uuidv4(),
      name: '',
      scriptContent: '',
      enabled: true,
    };
    setSettings(prev => ({
      ...prev,
      customScripts: [...(prev.customScripts || []), newScript],
    }));
  };

  const handleRemoveCustomScript = (id: string) => {
    setSettings(prev => ({
      ...prev,
      customScripts: (prev.customScripts || []).filter(script => script.id !== id),
    }));
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    let newLogoUrlIfUploaded: string | undefined = initialSettings.logoUrl; 

    try {
      if (logoFile) { 
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
      else if (settings.logoUrl === '' && initialSettings.logoUrl !== '') { 
         newLogoUrlIfUploaded = '';
      }


      const settingsToUpdate: Partial<GeneralSiteSettings> = {
        ...initialSettings, 
        siteTitle: settings.siteTitle || DEFAULT_SITE_TITLE,
        logoUrl: newLogoUrlIfUploaded,
        socialLinks: settings.socialLinks || [],
        customScripts: settings.customScripts || [],
        adLoaderScript: initialSettings.adLoaderScript 
      };

      await updateGeneralSettings(settingsToUpdate);
      setInitialSettings(settingsToUpdate);
      setSettings(settingsToUpdate); 
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
            const IconComponent = LucideIcons[link.iconName as keyof typeof LucideIcons] as LucideIcons.LucideIcon | undefined || LucideIcons.Link2;
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

      <Card>
        <CardHeader>
          <CardTitle>Custom Header Scripts</CardTitle>
          <CardDescription>
            Add custom scripts (e.g., Google Analytics, tracking pixels) to the &lt;head&gt; of your website.
            Use with caution, as invalid scripts can break your site.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(settings.customScripts || []).map((script, index) => (
            <div key={script.id} className="p-4 border rounded-md space-y-4">
              <div className="flex items-center justify-between">
                 <Label htmlFor={`custom-script-name-${script.id}`} className="text-base font-medium">
                  Script #{index + 1}
                </Label>
                <div className='flex items-center gap-2'>
                  <Label htmlFor={`custom-script-enabled-${script.id}`} className="text-sm">Enabled</Label>
                   <Switch
                    id={`custom-script-enabled-${script.id}`}
                    checked={script.enabled}
                    onCheckedChange={(checked) => handleCustomScriptChange(script.id, 'enabled', checked)}
                    disabled={isSaving}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveCustomScript(script.id)}
                    disabled={isSaving}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="h-5 w-5" />
                    <span className="sr-only">Remove Script</span>
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor={`custom-script-name-input-${script.id}`}>Script Name (Optional)</Label>
                <Input
                  id={`custom-script-name-input-${script.id}`}
                  placeholder="e.g., Google Analytics"
                  value={script.name}
                  onChange={(e) => handleCustomScriptChange(script.id, 'name', e.target.value)}
                  disabled={isSaving}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`custom-script-content-${script.id}`}>Script Content</Label>
                <Textarea
                  id={`custom-script-content-${script.id}`}
                  placeholder="<script async src='...'></script>"
                  value={script.scriptContent}
                  onChange={(e) => handleCustomScriptChange(script.id, 'scriptContent', e.target.value)}
                  rows={5}
                  className="font-mono text-sm mt-1"
                  disabled={isSaving}
                />
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={handleAddCustomScript} disabled={isSaving}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Script
          </Button>
        </CardContent>
      </Card>
      
      <CardFooter className="flex justify-end mt-8">
        <Button type="submit" size="lg" disabled={isSaving || isLoading}>
          {isSaving ? <LoadingSpinner message="Saving..." /> : 'Save General Settings'}
        </Button>
      </CardFooter>
    </form>
  );
}
