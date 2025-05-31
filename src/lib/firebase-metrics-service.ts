
"use client";

import { doc, runTransaction, onSnapshot, serverTimestamp, Timestamp, type Unsubscribe } from 'firebase/firestore';
import { firestore, auth } from './firebase'; // Ensure auth is imported

const DAILY_CONVERSIONS_COLLECTION_PATH = 'daily_conversion_metrics';

function getTodayUTCDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD format in UTC
}

/**
 * Ensures that Firebase Auth has initialized and onAuthStateChanged has fired at least once.
 */
function ensureAuthInitialized(): Promise<void> {
  // If auth.currentUser is already available, Firebase Auth has likely initialized.
  // However, to be certain onAuthStateChanged has run for the current session, we use the listener.
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      unsubscribe(); // Important to unsubscribe after the first emission to avoid memory leaks
      resolve();
    }, error => {
      unsubscribe();
      console.error("[MetricsService] Error during auth state initialization:", error);
      reject(error); // Propagate error if auth initialization itself fails
    });
  });
}


/**
 * Increments the conversion counter for the current UTC day in Firestore.
 * Uses a transaction to safely create or update the counter.
 */
export async function incrementDailyConversionCounter(): Promise<void> {
  try {
    await ensureAuthInitialized(); // Wait for auth to be initialized
  } catch (authError) {
    console.error("[MetricsService] Failed to ensure auth was initialized before incrementing counter:", authError);
    // Decide if you want to reject or proceed (currentUser might still be null)
    // For now, we'll let it proceed and the currentUser check below will handle it.
  }
  
  const currentUser = auth.currentUser; // Now get currentUser
  const dateString = getTodayUTCDateString();
  const dailyDocRef = doc(firestore, DAILY_CONVERSIONS_COLLECTION_PATH, dateString);


  console.log(
    `[MetricsService] Attempting to increment daily conversion counter for date: ${dateString}. Current User UID for transaction: ${currentUser?.uid || 'No User (Guest? Not Logged In)'}`
  );

  if (!currentUser) {
    console.warn(
      `[MetricsService] No authenticated user found AFTER ensureAuthInitialized for ${dateString}. Conversion increment WILL BE DENIED by Firestore rules or will fail if rules require auth.`
    );
    // This return will prevent the transaction if no user is found.
    // The Firestore rule `request.auth != null` would deny it anyway.
    return Promise.reject(new Error("User not authenticated for metrics increment after auth init."));
  }

  try {
    await runTransaction(firestore, async (transaction) => {
      const dailyDocSnap = await transaction.get(dailyDocRef);
      if (!dailyDocSnap.exists()) {
        console.log(
          `[MetricsService] Firestore Transaction: Document for ${dateString} does not exist. Creating with count 1.`
        );
        transaction.set(dailyDocRef, {
          count: 1,
          date: Timestamp.fromDate(new Date(dateString + 'T00:00:00Z')), // Store UTC date
          lastUpdated: serverTimestamp(),
        });
      } else {
        const currentCount = dailyDocSnap.data().count || 0;
        const newCount = currentCount + 1;
        console.log(
          `[MetricsService] Firestore Transaction: Document for ${dateString} exists. Current count: ${currentCount}, New count: ${newCount}.`
        );
        transaction.update(dailyDocRef, {
          count: newCount,
          lastUpdated: serverTimestamp(),
        });
      }
    });
    console.log(
      `[MetricsService] Successfully ran Firestore transaction to increment daily conversion count for ${dateString}. User UID during attempt: ${currentUser.uid}`
    );
  } catch (error) {
    console.error(
      `[MetricsService] Error in Firestore runTransaction for ${dateString}. User UID during attempt: ${currentUser.uid}:`,
      error // This will log the specific Firestore error (e.g., permission denied)
    );
    throw error; // Re-throw to be caught by the caller in recordConversion
  }
}

/**
 * Subscribes to real-time updates for a specific day's conversion count.
 * @param dateString The date in YYYY-MM-DD format (UTC).
 * @param callback Function to call with the count (or 0 if no data).
 * @returns Unsubscribe function.
 */
export function subscribeToDailyConversionCount(
  dateString: string,
  callback: (count: number) => void
): Unsubscribe {
  const dailyDocRef = doc(firestore, DAILY_CONVERSIONS_COLLECTION_PATH, dateString);
  console.log(`[MetricsService] Admin: Subscribing to daily conversion count for date: ${dateString}`);

  const unsubscribe = onSnapshot(dailyDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const count = docSnap.data().count || 0;
      console.log(`[MetricsService] Admin: Received update for ${dateString}. Count: ${count}`);
      callback(count);
    } else {
      console.log(`[MetricsService] Admin: No document found for ${dateString}. Reporting count 0.`);
      callback(0); // No document for this date, so count is 0
    }
  }, (error) => {
    console.error(`[MetricsService] Admin: Error subscribing to daily conversion count for ${dateString}:`, error);
    callback(0); // Assume 0 on error
  });

  return unsubscribe;
}
