
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
import Link from 'next/link'; // Import Link
import { useRouter } from 'next/navigation';

interface LimitDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userType: 'guest' | 'loggedIn';
  timeToWaitFormatted?: string;
  onPlan?: boolean;
  planName?: string;
  isPlanExhausted?: boolean;
}

export default function LimitDialog({ 
  isOpen, 
  onOpenChange, 
  userType, 
  timeToWaitFormatted,
  onPlan,
  planName,
  isPlanExhausted
}: LimitDialogProps) {
  const router = useRouter();

  let title = "Conversion Limit Reached";
  let description = "";
  let actionText = "";
  let actionLink = "";

  if (onPlan) {
    if (isPlanExhausted) {
      title = `${planName || 'Current'} Plan Quota Exhausted`;
      description = `You have used all conversions for your ${planName || 'current'} plan. Please upgrade your plan or wait for your quota to renew.`;
      actionText = "View Pricing Plans";
      actionLink = "/pricing";
    } else {
      // This case should ideally not trigger the dialog if limitStatus.allowed was true.
      // But as a fallback:
      description = `There was an issue with your plan. Please contact support.`;
      actionText = "Close";
    }
  } else { // Free tier limit
    if (userType === 'guest') {
      description = `You have used your 1 free conversion. Please wait ${timeToWaitFormatted ? timeToWaitFormatted : '24 hours'}, sign up for 5 free conversions, or choose a plan for more.`;
      actionText = "Sign Up / View Plans";
      actionLink = "/signup"; // Or /pricing, depending on primary CTA
    } else { // Logged-in user, free tier limit
      description = `You have used your 5 free conversions. Please wait ${timeToWaitFormatted ? timeToWaitFormatted : '24 hours'} or upgrade to a plan for more conversions.`;
      actionText = "View Pricing Plans";
      actionLink = "/pricing";
    }
  }

  const handleAction = () => {
    if (actionLink) {
      router.push(actionLink);
    }
    onOpenChange(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </AlertDialogCancel>
          {actionLink && ( // Only show action button if there's a link
            <AlertDialogAction asChild>
              <Button onClick={handleAction} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {actionText}
              </Button>
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
