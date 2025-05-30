"use client";

const GUEST_KEY_PREFIX = "XLSCONVERT_GUEST_CONVERSIONS";
const USER_KEY_PREFIX = "XLSCONVERT_USER_CONVERSIONS_";
const MAX_GUEST_CONVERSIONS = 1;
const MAX_LOGGED_IN_CONVERSIONS = 5;
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ConversionRecord {
  timestamp: number;
}

interface LimitStatus {
  allowed: boolean;
  remaining: number;
  timeToWaitMs?: number; // Time in milliseconds until the next conversion is allowed
}

function getStoredTimestamps(key: string): ConversionRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  } catch (error) {
    console.error("Error reading from local storage:", error);
    return [];
  }
}

function saveTimestamps(key: string, timestamps: ConversionRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(timestamps));
  } catch (error) {
    console.error("Error writing to local storage:", error);
  }
}

function getKey(userId: string | null): string {
  return userId ? `${USER_KEY_PREFIX}${userId}` : GUEST_KEY_PREFIX;
}

function getLimit(userId: string | null): number {
  return userId ? MAX_LOGGED_IN_CONVERSIONS : MAX_GUEST_CONVERSIONS;
}

export function checkConversionLimit(userId: string | null): LimitStatus {
  const key = getKey(userId);
  const limit = getLimit(userId);
  const now = Date.now();

  const allTimestamps = getStoredTimestamps(key);
  const validTimestamps = allTimestamps.filter(record => (now - record.timestamp) < WINDOW_MS);

  // Clean up old timestamps from local storage
  if (validTimestamps.length !== allTimestamps.length) {
    saveTimestamps(key, validTimestamps);
  }

  const remainingConversions = limit - validTimestamps.length;

  if (remainingConversions > 0) {
    return { allowed: true, remaining: remainingConversions };
  } else {
    // All conversions used within the window
    const oldestValidTimestamp = validTimestamps.length > 0 
      ? validTimestamps.sort((a, b) => a.timestamp - b.timestamp)[0].timestamp
      : now; // Should not happen if remaining is 0 and validTimestamps is empty, but as a fallback
      
    const timeToWaitMs = (oldestValidTimestamp + WINDOW_MS) - now;
    return { allowed: false, remaining: 0, timeToWaitMs: Math.max(0, timeToWaitMs) };
  }
}

export function recordConversion(userId: string | null): void {
  const key = getKey(userId);
  const now = Date.now();
  
  const allTimestamps = getStoredTimestamps(key);
  const validTimestamps = allTimestamps.filter(record => (now - record.timestamp) < WINDOW_MS);
  
  validTimestamps.push({ timestamp: now });
  saveTimestamps(key, validTimestamps);
}

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

