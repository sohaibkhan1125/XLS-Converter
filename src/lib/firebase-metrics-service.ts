
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

  try {
    await runTransaction(firestore, async (transaction) => {
      const dailyDocSnap = await transaction.get(dailyDocRef);

      if (!dailyDocSnap.exists()) {
        transaction.set(dailyDocRef, {
          count: 1,
          date: Timestamp.fromDate(new Date(dateString + 'T00:00:00Z')), // Store UTC date
          lastUpdated: serverTimestamp(),
        });
      } else {
        const newCount = (dailyDocSnap.data().count || 0) + 1;
        transaction.update(dailyDocRef, {
          count: newCount,
          lastUpdated: serverTimestamp(),
        });
      }
    });
    console.log(`Daily conversion count incremented for ${dateString}`);
  } catch (error) {
    console.error("Error incrementing daily conversion counter:", error);
    // Optionally, re-throw or handle more gracefully
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

  const unsubscribe = onSnapshot(dailyDocRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data().count || 0);
    } else {
      callback(0); // No document for this date, so count is 0
    }
  }, (error) => {
    console.error(`Error subscribing to daily conversion count for ${dateString}:`, error);
    callback(0); // Assume 0 on error
  });

  return unsubscribe;
}
