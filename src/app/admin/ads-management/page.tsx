
"use client";

import { useState, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { AdSettings } from '@/types/site-settings';
import { getAdSettings, updateAdSettings } from '@/lib/firebase-ads-service';
import LoadingSpinner from '@/components/core/loading-spinner';

export default function AdsManagementPage() {
  const { toast } = useToast();
  const [adSettings, setAdSettings] = useState<Partial<AdSettings>>({ adLoaderScript: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const currentSettings = await getAdSettings();
        if (currentSettings) {
          setAdSettings(currentSettings);
        }
      } catch (error) {
        console.error("Error fetching ad settings:", error);
        toast({ variant: 'destructive', title: 'Error Fetching Settings', description: 'Could not load ad settings.' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [toast]);

  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdSettings(prev => ({ ...prev, adLoaderScript: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAdSettings({ adLoaderScript: adSettings.adLoaderScript || '' });
      toast({ title: 'Ad Settings Saved', description: 'Your ad script has been updated successfully.' });
    } catch (error) {
      console.error("Error saving ad settings:", error);
      toast({ variant: 'destructive', title: 'Save Error', description: 'Could not save ad settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner message="Loading Ad Settings..." /></div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ads Script Management</CardTitle>
          <CardDescription>
            Manage the primary ad loader script for your website (e.g., Google AdSense main script).
            This script will be injected into the &lt;head&gt; of your website pages.
            Actual ad units need to be placed manually in your site's content where you want them to appear.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="adLoaderScript">Ad Loader Script</Label>
            <Textarea
              id="adLoaderScript"
              value={adSettings.adLoaderScript || ''}
              onChange={handleScriptChange}
              placeholder="<script async src='https://pagedload2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR_CLIENT_ID' crossorigin='anonymous'></script>"
              rows={10}
              className="font-mono text-sm"
              disabled={isSaving}
            />
            <p className="text-xs text-muted-foreground">
              Paste the main script provided by your ad network (e.g., AdSense, Ezoic). This usually goes in the &lt;head&gt; tag.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSaving || isLoading}>
            {isSaving ? <LoadingSpinner message="Saving..." /> : 'Save Ad Settings'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
