
"use client";

import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from '@/components/core/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { currentUser, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, loading, router]);
  
  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`;
    if (email) return email.slice(0, 2).toUpperCase();
    return 'U';
  };

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <LoadingSpinner message="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Your Profile</CardTitle>
          <CardDescription>
            Manage your personal information and account settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={currentUser.photoURL || undefined} alt="User avatar" />
              <AvatarFallback className="text-3xl">
                {getInitials(userProfile?.firstName, userProfile?.lastName, currentUser.email || '')}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-2xl font-semibold">
                {userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Welcome!'}
              </h2>
              <p className="text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>
          <div className="text-center pt-4">
            <p className="text-muted-foreground">This page is a placeholder for future profile management features.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
