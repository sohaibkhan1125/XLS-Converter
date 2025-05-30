
"use client";

const GUEST_FREE_TIER_KEY_PREFIX = "XLSCONVERT_GUEST_CONVERSIONS";
const USER_FREE_TIER_KEY_PREFIX = "XLSCONVERT_USER_CONVERSIONS_";
const MAX_GUEST_CONVERSIONS = 1;
const MAX_LOGGED_IN_CONVERSIONS = 5;
const FREE_TIER_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const PLAN_KEY_PREFIX = "XLSCONVERT_ACTIVE_PLAN_";
const MONTH_MS = 30 * 24 * 60 * 60 * 1000; // Approx 30 days
const YEAR_MS = 365 * 24 * 60 * 60 * 1000; // Approx 365 days

interface ConversionRecord {
  timestamp: number;
}

export interface ActivePlan {
  name: string;
  totalConversions: number;
  usedConversions: number;
  activatedAt: number;
  billingCycle: 'monthly' | 'annual';
}

export interface PlanDetails {
  id: string;
  name: string;
  conversions: number;
  cycle: 'monthly' | 'annual';
  price: number; // For display on toast, etc.
}


// --- Plan Management Functions ---

function getPlanKey(userId: string | null): string {
  return userId ? `${PLAN_KEY_PREFIX}${userId}` : `${PLAN_KEY_PREFIX}guest`;
}

export function activatePlan(userId: string | null, planDetails: PlanDetails): ActivePlan {
  const planKey = getPlanKey(userId);
  const newPlan: ActivePlan = {
    name: planDetails.name,
    totalConversions: planDetails.conversions,
    usedConversions: 0,
    activatedAt: Date.now(),
    billingCycle: planDetails.cycle,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(planKey, JSON.stringify(newPlan));
    } catch (error) {
      console.error("Error saving active plan to local storage:", error);
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
    const planDuration = plan.billingCycle === 'monthly' ? MONTH_MS : YEAR_MS;

    if (now - plan.activatedAt > planDuration) {
      localStorage.removeItem(planKey); // Clean up "expired" plan
      return null;
    }
    return plan;
  } catch (error) {
    console.error("Error reading active plan from local storage:", error);
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
      console.error("Error updating plan conversions in local storage:", error);
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
    console.error("Error reading from local storage for free tier:", error);
    return [];
  }
}

function saveFreeTierTimestamps(key: string, timestamps: ConversionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch (error) {
    console.error("Error writing to local storage for free tier:", error);
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
}

export function checkConversionLimit(userId: string | null): LimitStatus {
  const activePlan = getActivePlan(userId);

  if (activePlan) {
    if (activePlan.usedConversions < activePlan.totalConversions) {
      return {
        allowed: true,
        remaining: activePlan.totalConversions - activePlan.usedConversions,
        onPlan: true,
        planName: activePlan.name,
      };
    } else {
      // Plan exists but conversions are exhausted.
      return {
        allowed: false,
        remaining: 0,
        onPlan: true,
        planName: activePlan.name,
        isPlanExhausted: true,
      };
    }
  }

  // Fallback to free tier logic if no active/valid plan
  const freeTierKey = getFreeTierKey(userId);
  const freeTierLimit = getFreeTierLimit(userId);
  const now = Date.now();

  const allTimestamps = getStoredFreeTierTimestamps(freeTierKey);
  const validTimestamps = allTimestamps.filter(record => (now - record.timestamp) < FREE_TIER_WINDOW_MS);

  if (validTimestamps.length !== allTimestamps.length) {
    saveFreeTierTimestamps(freeTierKey, validTimestamps);
  }

  const remainingConversions = freeTierLimit - validTimestamps.length;

  if (remainingConversions > 0) {
    return { allowed: true, remaining: remainingConversions, onPlan: false };
  } else {
    const oldestValidTimestamp = validTimestamps.length > 0
      ? validTimestamps.sort((a, b) => a.timestamp - b.timestamp)[0].timestamp
      : now;
    const timeToWaitMs = (oldestValidTimestamp + FREE_TIER_WINDOW_MS) - now;
    return { allowed: false, remaining: 0, timeToWaitMs: Math.max(0, timeToWaitMs), onPlan: false };
  }
}

export function recordConversion(userId: string | null): void {
  if (consumePlanConversion(userId)) {
    return; // Conversion recorded against the plan
  }

  // Fallback to free tier recording
  const freeTierKey = getFreeTierKey(userId);
  const now = Date.now();
  const allTimestamps = getStoredFreeTierTimestamps(freeTierKey);
  // Ensure we are only keeping timestamps within the window for the new record
  const validTimestamps = allTimestamps.filter(record => (now - record.timestamp) < FREE_TIER_WINDOW_MS);
  validTimestamps.push({ timestamp: now });
  saveFreeTierTimestamps(freeTierKey, validTimestamps);
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
