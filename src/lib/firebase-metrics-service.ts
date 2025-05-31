
"use client";

import { doc, runTransaction, onSnapshot, serverTimestamp, Timestamp, type Unsubscribe } from 'firebase/firestore';
import { firestore } from './firebase';

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
  console.log(`Attempting to increment daily conversion counter for date: ${dateString}`);

  try {
    await runTransaction(firestore, async (transaction) => {
      const dailyDocSnap = await transaction.get(dailyDocRef);

      if (!dailyDocSnap.exists()) {
        console.log(`Document for ${dateString} does not exist. Creating with count 1.`);
        transaction.set(dailyDocRef, {
          count: 1,
          date: Timestamp.fromDate(new Date(dateString + 'T00:00:00Z')), // Store UTC date
          lastUpdated: serverTimestamp(),
        });
      } else {
        const currentCount = dailyDocSnap.data().count || 0;
        const newCount = currentCount + 1;
        console.log(`Document for ${dateString} exists. Current count: ${currentCount}, New count: ${newCount}.`);
        transaction.update(dailyDocRef, {
          count: newCount,
          lastUpdated: serverTimestamp(),
        });
      }
    });
    console.log(`Successfully incremented daily conversion count for ${dateString}`);
  } catch (error) {
    console.error(`Error incrementing daily conversion counter for ${dateString}:`, error);
    // Optionally, re-throw or handle more gracefully
    // throw error; // Re-throwing might break the conversion flow if not caught upstream
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
  console.log(`Subscribing to daily conversion count for date: ${dateString}`);

  const unsubscribe = onSnapshot(dailyDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const count = docSnap.data().count || 0;
      console.log(`Received update for ${dateString}. Count: ${count}`);
      callback(count);
    } else {
      console.log(`No document found for ${dateString}. Reporting count 0.`);
      callback(0); // No document for this date, so count is 0
    }
  }, (error) => {
    console.error(`Error subscribing to daily conversion count for ${dateString}:`, error);
    callback(0); // Assume 0 on error
  });

  return unsubscribe;
}

