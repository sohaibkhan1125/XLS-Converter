import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface LimitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userType: 'guest' | 'loggedIn';
  timeToWaitFormatted?: string;
}

export default function LimitDialog({ isOpen, onOpenChange, userType, timeToWaitFormatted }: LimitDialogProps) {
  const router = useRouter();

  const guestMessage = `You have used your 1 free conversion. Please wait ${timeToWaitFormatted ? timeToWaitFormatted : '24 hours'} or sign up for 5 free conversions.`;
  const loggedInMessage = `You have used your 5 free conversions. Please wait ${timeToWaitFormatted ? timeToWaitFormatted : '24 hours'} or upgrade for unlimited use.`;

  const handleAction = () => {
    if (userType === 'guest') {
      router.push('/signup');
    } else {
      // Dummy link for upgrade plan
      router.push('/#upgrade-plan'); 
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Conversion Limit Reached</AlertDialogTitle>
          <AlertDialogDescription>
            {userType === 'guest' ? guestMessage : loggedInMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button onClick={handleAction} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {userType === 'guest' ? 'Sign Up / Log In' : 'Upgrade Plan'}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
