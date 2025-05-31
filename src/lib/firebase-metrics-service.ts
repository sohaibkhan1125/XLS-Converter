
"use client";

import { doc, runTransaction, onSnapshot, serverTimestamp, Timestamp, type Unsubscribe } from 'firebase/firestore';
import { firestore, auth } from './firebase'; // Ensure auth is imported

const DAILY_CONVERSIONS_COLLECTION_PATH = 'daily_conversion_metrics';

function getUTCDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD format in UTC
}

/**
 * Increments the conversion counter for the current UTC day in Firestore.
 * Uses a transaction to safely create or update the counter.
 */
export async function incrementDailyConversionCounter(): Promise<void> {
  const dateString = getUTCDateString();
  const dailyDocRef = doc(firestore, DAILY_CONVERSIONS_COLLECTION_PATH, dateString);
  const currentUser = auth.currentUser; // Get current user at the time of call

  console.log(
    `[MetricsService] Attempting to increment daily conversion counter for date: ${dateString}. Current User UID for transaction: ${currentUser?.uid || 'No User (Guest? Not Logged In)'}`
  );

  if (!currentUser) {
    console.warn(
      `[MetricsService] No authenticated user found at the moment of Firestore transaction for ${dateString}. Conversion increment might be denied by Firestore rules if 'request.auth != null' is required for write.`
    );
    // Note: The current Firestore rule for write IS `request.auth != null`.
    // So if currentUser is null here, the transaction WILL fail due to permissions.
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
      `[MetricsService] Successfully ran Firestore transaction to increment daily conversion count for ${dateString}. User UID during attempt: ${currentUser?.uid || 'N/A'}`
    );
  } catch (error) {
    console.error(
      `[MetricsService] Error in Firestore runTransaction for ${dateString}. User UID during attempt: ${currentUser?.uid || 'N/A'}:`,
      error // This will log the specific Firestore error (e.g., permission denied)
    );
    // It's important not to re-throw here unless the caller is prepared to handle it,
    // to avoid breaking the main conversion flow if just the metric update fails.
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
