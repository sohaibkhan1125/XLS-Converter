
"use client";

// Removed: import { incrementDailyConversionCounter } from './firebase-metrics-service';

const GUEST_FREE_TIER_KEY_PREFIX = "XLSCONVERT_GUEST_CONVERSIONS";
const USER_FREE_TIER_KEY_PREFIX = "XLSCONVERT_USER_CONVERSIONS_";
const MAX_GUEST_CONVERSIONS = 1;
const MAX_LOGGED_IN_CONVERSIONS = 5;
const FREE_TIER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const PLAN_KEY_PREFIX = "XLSCONVERT_ACTIVE_PLAN_";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000; // Approx 30 days
const YEAR_MS = 365 * 24 * 60 * 60 * 1000; // Approx 365 days
const TRIAL_DURATION_MS = (days: number) => days * 24 * 60 * 60 * 1000;

interface ConversionRecord {
  timestamp: number;
}

export interface ActivePlan {
  name: string;
  totalConversions: number;
  usedConversions: number;
  activatedAt: number;
  billingCycle: 'monthly' | 'annual';
  isTrial?: boolean; 
  trialEndsAt?: number; 
}

export interface PlanDetails {
  id: string;
  name: string;
  conversions: number;
  cycle: 'monthly' | 'annual';
  price: number; 
  trialDays?: number;
}


// --- Plan Management Functions ---

function getPlanKey(userId: string | null): string {
  return userId ? `${PLAN_KEY_PREFIX}${userId}` : `${PLAN_KEY_PREFIX}guest_plan`;
}

export function activatePlan(userId: string | null, planDetails: PlanDetails): ActivePlan {
  const planKey = getPlanKey(userId);
  let newPlan: ActivePlan;

  console.log(`[LocalStorageLimits] Activating plan: ${planDetails.name}, Trial Days: ${planDetails.trialDays}`);
  newPlan = {
    name: planDetails.name,
    totalConversions: planDetails.conversions,
    usedConversions: 0,
    activatedAt: Date.now(),
    billingCycle: planDetails.cycle,
    isTrial: planDetails.trialDays && planDetails.trialDays > 0 ? true : false,
    trialEndsAt: planDetails.trialDays && planDetails.trialDays > 0 ? Date.now() + TRIAL_DURATION_MS(planDetails.trialDays) : undefined,
  };
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(planKey, JSON.stringify(newPlan));
    } catch (error) {
      console.error("[LocalStorageLimits] Error saving active plan to local storage:", error);
    }
  }
  return newPlan;
}

export function getActivePlan(userId: string | null): ActivePlan | null {
  if (typeof window === 'undefined') return null;
  const planKey = getPlanKey(userId);
  try {
    const item = localStorage.getItem(planKey);
    if (!item) return null;

    const plan = JSON.parse(item) as ActivePlan;
    const now = Date.now();

    // Check overall plan expiration based on billing cycle from activation date
    const planDuration = plan.billingCycle === 'monthly' ? MONTH_MS : YEAR_MS;
    if (now - plan.activatedAt > planDuration) {
      console.log(`[LocalStorageLimits] Paid plan ${plan.name} main duration expired. Removing.`);
      localStorage.removeItem(planKey); // Clean up expired paid plan
      return null;
    }

    // If the plan is within its main duration, it's considered active.
    // The `isTrial` and `trialEndsAt` fields are now primarily informational for the UI
    // to indicate if the user is within that initial phase of their paid plan.
    // The trial ending does not invalidate the plan if the main duration is still active.
    
    // Optional: If you want to update the plan in localStorage to set isTrial=false after trialEndsAt:
    // if (plan.isTrial && plan.trialEndsAt && now > plan.trialEndsAt) {
    //   const updatedPlan = { ...plan, isTrial: false };
    //   try {
    //     localStorage.setItem(planKey, JSON.stringify(updatedPlan));
    //     return updatedPlan; // Return the updated plan state
    //   } catch (error) {
    //     console.error("[LocalStorageLimits] Error updating plan to non-trial state:", error);
    //     // Fall through to return original plan if update fails
    //   }
    // }

    return plan;
  } catch (error) {
    console.error("[LocalStorageLimits] Error reading active plan from local storage:", error);
    localStorage.removeItem(planKey); // Remove potentially corrupted data
    return null;
  }
}

function consumePlanConversion(userId: string | null): boolean {
  if (typeof window === 'undefined') return false;
  const activePlan = getActivePlan(userId);
  if (activePlan && activePlan.usedConversions < activePlan.totalConversions) {
    activePlan.usedConversions += 1;
    try {
      localStorage.setItem(getPlanKey(userId), JSON.stringify(activePlan));
      return true;
    } catch (error) {
      console.error("[LocalStorageLimits] Error updating plan conversions in local storage:", error);
      return false;
    }
  }
  return false;
}

// --- Free Tier Management Functions ---

function getStoredFreeTierTimestamps(key: string): ConversionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error("[LocalStorageLimits] Error reading from local storage for free tier:", error);
    return [];
  }
}

function saveFreeTierTimestamps(key: string, timestamps: ConversionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch (error) {
    console.error("[LocalStorageLimits] Error writing to local storage for free tier:", error);
  }
}

function getFreeTierKey(userId: string | null): string {
  return userId ? `${USER_FREE_TIER_KEY_PREFIX}${userId}` : GUEST_FREE_TIER_KEY_PREFIX;
}

function getFreeTierLimit(userId: string | null): number {
  return userId ? MAX_LOGGED_IN_CONVERSIONS : MAX_GUEST_CONVERSIONS;
}


// --- Combined Limit Checking and Recording ---

export interface LimitStatus {
  allowed: boolean;
  remaining: number;
  timeToWaitMs?: number; // For free tier cooldown
  onPlan: boolean;
  planName?: string;
  isPlanExhausted?: boolean; // True if on a plan but quota is used up
  isTrial?: boolean; // True if currently within the initial trial phase of a paid plan
  trialEndsAt?: number; // Timestamp if in trial phase
}

export function checkConversionLimit(userId: string | null): LimitStatus {
  const activePlan = getActivePlan(userId);
  const now = Date.now();

  if (activePlan) {
    const isCurrentlyInTrialPhase = activePlan.isTrial && activePlan.trialEndsAt && now < activePlan.trialEndsAt;
    if (activePlan.usedConversions < activePlan.totalConversions) {
      return {
        allowed: true,
        remaining: activePlan.totalConversions - activePlan.usedConversions,
        onPlan: true,
        planName: activePlan.name,
        isTrial: isCurrentlyInTrialPhase,
        trialEndsAt: activePlan.trialEndsAt,
      };
    } else {
      // Plan exists but conversions are exhausted.
      return {
        allowed: false,
        remaining: 0,
        onPlan: true,
        planName: activePlan.name,
        isPlanExhausted: true,
        isTrial: isCurrentlyInTrialPhase,
        trialEndsAt: activePlan.trialEndsAt,
      };
    }
  }

  // Fallback to free tier logic if no active/valid plan
  const freeTierKey = getFreeTierKey(userId);
  const freeTierLimit = getFreeTierLimit(userId);
  
  const allTimestamps = getStoredFreeTierTimestamps(freeTierKey);
  const validTimestamps = allTimestamps.filter(record => (now - record.timestamp) < FREE_TIER_WINDOW_MS);

  if (validTimestamps.length !== allTimestamps.length) {
    saveFreeTierTimestamps(freeTierKey, validTimestamps);
  }

  const remainingConversions = freeTierLimit - validTimestamps.length;

  if (remainingConversions > 0) {
    return { allowed: true, remaining: remainingConversions, onPlan: false, isTrial: false };
  } else {
    const oldestValidTimestamp = validTimestamps.length > 0
      ? validTimestamps.sort((a, b) => a.timestamp - b.timestamp)[0].timestamp
      : now;
    const timeToWaitMs = (oldestValidTimestamp + FREE_TIER_WINDOW_MS) - now;
    return { allowed: false, remaining: 0, timeToWaitMs: Math.max(0, timeToWaitMs), onPlan: false, isTrial: false };
  }
}

export function recordConversion(userId: string | null): void {
  console.log(`[LocalStorageLimits] recordConversion called for user: ${userId || 'guest'}.`);

  if (consumePlanConversion(userId)) {
    console.log("[LocalStorageLimits] Local conversion recorded against user's plan.");
    return; 
  }

  console.log("[LocalStorageLimits] Recording local conversion against free tier.");
  const freeTierKey = getFreeTierKey(userId);
  const now = Date.now();
  const allTimestamps = getStoredFreeTierTimestamps(freeTierKey);
  const validTimestamps = allTimestamps.filter(
    (record) => now - record.timestamp < FREE_TIER_WINDOW_MS
  );
  validTimestamps.push({ timestamp: now });
  saveFreeTierTimestamps(freeTierKey, validTimestamps);
  console.log(`[LocalStorageLimits] Free tier timestamps updated for ${freeTierKey}. Current count in window: ${validTimestamps.length}`);
}

// --- Utility ---
export function formatTime(milliseconds: number): string {
  if (milliseconds <= 0) return "0 seconds";

  let seconds = Math.floor(milliseconds / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
  
  return parts.join(', ');
}
