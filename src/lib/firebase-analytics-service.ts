
"use client";

import { collection, addDoc, serverTimestamp, getDocs, query, where, Timestamp, getCountFromServer } from 'firebase/firestore';
import { firestore } from './firebase';

const CONVERSION_LOGS_COLLECTION = 'conversion_logs';

export interface ConversionLog {
  id?: string; // Firestore document ID
  timestamp: Timestamp; // Firestore Timestamp
  userType: 'guest' | 'loggedIn';
  userId?: string; // UID if userType is 'loggedIn'
}

/**
 * Logs a conversion event to Firestore.
 */
export async function logConversionToFirestore(
  userType: 'guest' | 'loggedIn',
  userId?: string
): Promise<void> {
  try {
    const logData: Omit<ConversionLog, 'id' | 'timestamp'> & { timestamp: any } = {
      timestamp: serverTimestamp(),
      userType,
    };
    if (userId && userType === 'loggedIn') {
      logData.userId = userId;
    }
    await addDoc(collection(firestore, CONVERSION_LOGS_COLLECTION), logData);
    console.log('[AnalyticsService] Conversion logged to Firestore:', logData);
  } catch (error) {
    console.error('[AnalyticsService] Error logging conversion to Firestore:', error);
    // For now, log and continue, as local limits are primary for user-facing restrictions
  }
}

/**
 * Fetches the total number of conversions.
 */
export async function getTotalConversionsCount(): Promise<number> {
  try {
    const coll = collection(firestore, CONVERSION_LOGS_COLLECTION);
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('[AnalyticsService] Error fetching total conversions count:', error);
    return 0;
  }
}

export interface ChartDataPoint {
  name: string; // Hour or Date string
  conversions: number;
}

/**
 * Fetches and aggregates conversion data for charts.
 */
export async function getAggregatedConversionData(
  timeRange: '24h' | '7d' | '30d'
): Promise<ChartDataPoint[]> {
  const now = new Date();
  let startDate: Date;

  switch (timeRange) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0); // Start of the day 7 days ago
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0); // Start of the day 30 days ago
      break;
    default:
      throw new Error('Invalid time range for conversion data');
  }

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(now); // Query up to the current moment

  const q = query(
    collection(firestore, CONVERSION_LOGS_COLLECTION),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp) 
  );

  try {
    const querySnapshot = await getDocs(q);
    const logs: ConversionLog[] = [];
    querySnapshot.forEach((doc) => {
      // Ensure timestamp is a Firestore Timestamp before calling toDate()
      const data = doc.data();
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        logs.push({ id: doc.id, ...data } as ConversionLog);
      } else {
        // Handle cases where timestamp might be missing or not a Firestore Timestamp
        // This could happen if serverTimestamp() hasn't resolved yet for very new docs,
        // or if data is malformed. For aggregation, we might skip these or log a warning.
        console.warn(`[AnalyticsService] Log ${doc.id} missing or has invalid timestamp format.`);
      }
    });

    if (timeRange === '24h') {
      return aggregateHourly(logs, now);
    } else {
      return aggregateDaily(logs, timeRange, now);
    }
  } catch (error) {
    console.error(`[AnalyticsService] Error fetching aggregated conversion data for ${timeRange}:`, error);
    return [];
  }
}

function aggregateHourly(logs: ConversionLog[], now: Date): ChartDataPoint[] {
  const hourlyCounts: Record<number, number> = {};
  // Initialize all hours for the last 24-hour period leading up to 'now'
  for (let i = 0; i < 24; i++) {
    const hourKey = new Date(now.getTime() - i * 60 * 60 * 1000).getHours();
    hourlyCounts[hourKey] = 0;
  }
  
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  logs.forEach(log => {
    const logDate = log.timestamp.toDate();
    if (logDate >= twentyFourHoursAgo) { // Ensure log is within the last 24 hours
        const hour = logDate.getHours();
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    }
  });

  const chartData: ChartDataPoint[] = [];
  // Generate data points from 24 hours ago up to the current hour
  for (let i = 23; i >= 0; i--) { // Iterate from T-23h, T-22h, ..., T-0h (current hour)
    const dateForHour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = dateForHour.getHours();
    chartData.push({
      name: `${hour}:00`,
      conversions: hourlyCounts[hour] || 0,
    });
  }
  return chartData;
}


function aggregateDaily(logs: ConversionLog[], timeRange: '7d' | '30d', now: Date): ChartDataPoint[] {
  const dailyCounts: Record<string, number> = {}; // Key: YYYY-MM-DD
  const daysToDisplay = timeRange === '7d' ? 7 : 30;

  // Initialize all days in the range to 0
  for (let i = 0; i < daysToDisplay; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i); // Iterate from today backwards
    date.setHours(0,0,0,0); // Normalize to start of the day
    const dateString = date.toISOString().split('T')[0];
    dailyCounts[dateString] = 0;
  }

  logs.forEach(log => {
    const logDate = log.timestamp.toDate();
    logDate.setHours(0,0,0,0); // Normalize log date to start of the day
    const dateString = logDate.toISOString().split('T')[0];
    if (dailyCounts.hasOwnProperty(dateString)) { // Ensure the log date is within our display range
         dailyCounts[dateString] = (dailyCounts[dateString] || 0) + 1;
    }
  });
  
  const chartData = Object.entries(dailyCounts)
    .map(([dateString, count]) => ({
      // For 'name', ensure consistent formatting for sorting and display
      name: dateString, // Keep YYYY-MM-DD for sorting initially
      displayName: new Date(dateString + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      conversions: count,
    }))
    .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime()) // Sort by YYYY-MM-DD
    .map(item => ({ name: item.displayName, conversions: item.conversions })); // Map to display name after sorting

  return chartData;
}
