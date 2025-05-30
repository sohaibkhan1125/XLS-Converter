
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { NavbarSettings, NavItem } from '@/types/navbar';
import { getNavbarSettings, updateNavbarSettings, uploadSiteLogo, deleteSiteLogo } from '@/lib/firebase-navbar-service';
import { Trash2, Edit3, PlusCircle, UploadCloud, ImageOff } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import LoadingSpinner from '@/components/core/loading-spinner';

export default function NavbarManagementPage() {
  const { toast } = useToast();

  const [settings, setSettings] = useState<Partial<NavbarSettings>>({});
  const [initialSettings, setInitialSettings] = useState<Partial<NavbarSettings>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [currentNavItem, setCurrentNavItem] = useState<{ id?: string; label: string; href: string }>({ label: '', href: '' });
  const [isEditingNavItem, setIsEditingNavItem] = useState<string | null>(null);


  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentSettings = await getNavbarSettings();
      if (currentSettings) {
        setSettings(currentSettings);
        setInitialSettings(currentSettings); // Store initial settings for comparison or revert
        setNavItems(currentSettings.navItems || []);
        if (currentSettings.logoUrl) {
          setLogoPreview(currentSettings.logoUrl);
        }
      } else {
        // Initialize with defaults if no settings found
        const defaultSettings = { siteTitle: 'XLSConvert', navItems: [] };
        setSettings(defaultSettings);
        setInitialSettings(defaultSettings);
        setNavItems([]);
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
    if (settings.logoUrl) {
      setIsSaving(true);
      try {
        await deleteSiteLogo(settings.logoUrl);
        setSettings(prev => ({ ...prev, logoUrl: undefined }));
        setLogoPreview(null);
        setLogoFile(null);
        await updateNavbarSettings({ logoUrl: '' }); // Send empty string to signify deletion
        toast({ title: 'Logo Removed', description: 'The site logo has been removed.' });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error Removing Logo', description: 'Could not remove the logo.' });
      } finally {
        setIsSaving(false);
      }
    } else if (logoFile || logoPreview) { // Removing a pending upload or local preview
        setLogoFile(null);
        setLogoPreview(null);
        toast({ title: 'Local Logo Cleared', description: 'The selected logo has been cleared.' });
    }
  };

  const handleSiteTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, siteTitle: e.target.value }));
  };

  const handleNavItemChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentNavItem(prev => ({ ...prev, [name]: value }));
  };

  const handleAddOrUpdateNavItem = () => {
    if (!currentNavItem.label || !currentNavItem.href) {
      toast({ variant: 'destructive', title: 'Missing Fields', description: 'Label and Link URL are required for a nav item.' });
      return;
    }
    if (isEditingNavItem) {
      setNavItems(navItems.map(item => item.id === isEditingNavItem ? { ...item, label: currentNavItem.label, href: currentNavItem.href } : item));
      setIsEditingNavItem(null);
    } else {
      setNavItems([...navItems, { id: uuidv4(), label: currentNavItem.label, href: currentNavItem.href }]);
    }
    setCurrentNavItem({ label: '', href: '' }); // Reset form
  };

  const handleEditNavItem = (navItem: NavItem) => {
    setIsEditingNavItem(navItem.id);
    setCurrentNavItem({ id: navItem.id, label: navItem.label, href: navItem.href });
  };

  const handleDeleteNavItem = (id: string) => {
    setNavItems(navItems.filter(item => item.id !== id));
    if (isEditingNavItem === id) { // If deleting the item currently being edited
        setIsEditingNavItem(null);
        setCurrentNavItem({ label: '', href: '' });
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let newLogoUrl = settings.logoUrl;

    try {
      if (logoFile) {
        // If there was an old logo, delete it first if it's different from the new one
        if (settings.logoUrl && settings.logoUrl !== logoPreview) { // Check if it's not the same URL
          try {
            await deleteSiteLogo(settings.logoUrl);
          } catch (delError) {
            console.warn("Could not delete old logo during replacement:", delError);
            // Non-critical, continue with upload
          }
        }
        newLogoUrl = await uploadSiteLogo(logoFile);
      }
      
      const updatedSettings: NavbarSettings = {
        ...settings,
        logoUrl: newLogoUrl,
        navItems: navItems,
      };
      
      await updateNavbarSettings(updatedSettings);
      setSettings(updatedSettings); // Update local state to reflect saved state including new logo URL
      setInitialSettings(updatedSettings); // Update initial settings baseline
      setLogoFile(null); // Clear the file input after successful upload
      if (newLogoUrl) setLogoPreview(newLogoUrl); // Update preview to the new URL

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
          <CardDescription>Upload or change your website logo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUpload">Upload Logo</Label>
            <div className="flex items-center gap-4">
              <Input id="logoUpload" type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" disabled={isSaving} />
              {logoPreview && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" type="button" disabled={isSaving}>
                      <Trash2 className="mr-2 h-4 w-4" /> Remove Logo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Confirm Removal</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>Are you sure you want to remove the current logo?</AlertDialogDescription>
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
          <CardDescription>Set the main title for your website that appears in the navbar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input 
            id="siteTitle" 
            value={settings.siteTitle || ''} 
            onChange={handleSiteTitleChange} 
            placeholder="e.g., XLSConvert" 
            disabled={isSaving}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Navigation Items</CardTitle>
          <CardDescription>Manage the links that appear in your website's main navigation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 p-4 border rounded-md">
            <h3 className="font-semibold text-lg">{isEditingNavItem ? 'Edit Nav Item' : 'Add New Nav Item'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <Label htmlFor="navItemLabel">Label</Label>
                <Input id="navItemLabel" name="label" placeholder="e.g., Home" value={currentNavItem.label} onChange={handleNavItemChange} disabled={isSaving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="navItemHref">Link URL</Label>
                <Input id="navItemHref" name="href" placeholder="e.g., / or /about" value={currentNavItem.href} onChange={handleNavItemChange} disabled={isSaving} />
              </div>
              <Button type="button" onClick={handleAddOrUpdateNavItem} className="whitespace-nowrap" disabled={isSaving}>
                <PlusCircle className="mr-2 h-4 w-4" /> {isEditingNavItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
             {isEditingNavItem && (
                <Button type="button" variant="outline" size="sm" onClick={() => { setIsEditingNavItem(null); setCurrentNavItem({label: '', href: ''})}} disabled={isSaving}>
                    Cancel Edit
                </Button>
            )}
          </div>

          {navItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Current Nav Items</h3>
              <ul className="space-y-2">
                {navItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between p-3 border rounded-md bg-muted/20 shadow-sm">
                    <div>
                      <span className="font-medium">{item.label}</span>
                      <span className="text-sm text-muted-foreground ml-2">({item.href})</span>
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline" size="icon" type="button" onClick={() => handleEditNavItem(item)} disabled={isSaving}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="icon" type="button" disabled={isSaving}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogDescription>Are you sure you want to delete the &quot;{item.label}&quot; nav item?</AlertDialogDescription>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteNavItem(item.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex justify-end mt-8">
        <Button type="submit" size="lg" disabled={isSaving || isLoading}>
          {isSaving ? <LoadingSpinner message="Saving..." /> : 'Save All Navbar Settings'}
        </Button>
      </div>
    </form>
  );
}
