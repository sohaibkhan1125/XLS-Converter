
"use client";

import { collection, addDoc, serverTimestamp, getDocs, query, where, Timestamp, getCountFromServer } from 'firebase/firestore';
import { firestore } from './firebase';
import { format } from 'date-fns';

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
    // console.log('[AnalyticsService] Conversion logged to Firestore:', logData);
  } catch (error) {
    console.error('[AnalyticsService] Error logging conversion to Firestore:', error);
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
      startDate.setHours(0, 0, 0, 0); 
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      break;
    default:
      throw new Error('Invalid time range for conversion data');
  }

  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(now); 

  const q = query(
    collection(firestore, CONVERSION_LOGS_COLLECTION),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp) 
  );

  try {
    const querySnapshot = await getDocs(q);
    const logs: ConversionLog[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        logs.push({ id: doc.id, ...data } as ConversionLog);
      } else {
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
  const hourlyCounts: Record<string, number> = {}; // Key: "HH:00"
  
  // Initialize slots for the last 24 hours ending with the current hour
  for (let i = 0; i < 24; i++) {
    const dateForHour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourString = format(dateForHour, 'HH:00');
    hourlyCounts[hourString] = 0;
  }
  
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  logs.forEach(log => {
    const logDate = log.timestamp.toDate();
    if (logDate >= twentyFourHoursAgo) { 
        const hourString = format(logDate, 'HH:00');
        if (hourlyCounts.hasOwnProperty(hourString)) { // Ensure we only count hours we initialized
            hourlyCounts[hourString] = (hourlyCounts[hourString] || 0) + 1;
        }
    }
  });

  // Create chart data ensuring correct chronological order from T-23h to T-0h
  const chartData: ChartDataPoint[] = [];
  for (let i = 23; i >= 0; i--) { 
    const dateForHour = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hourString = format(dateForHour, 'HH:00');
    chartData.push({
      name: hourString,
      conversions: hourlyCounts[hourString] || 0,
    });
  }
  return chartData;
}


function aggregateDaily(logs: ConversionLog[], timeRange: '7d' | '30d', now: Date): ChartDataPoint[] {
  const dailyCounts: Record<string, number> = {}; // Key: YYYY-MM-DD
  const daysToDisplay = timeRange === '7d' ? 7 : 30;

  for (let i = 0; i < daysToDisplay; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dateString = format(date, 'yyyy-MM-dd');
    dailyCounts[dateString] = 0;
  }

  logs.forEach(log => {
    const logDate = log.timestamp.toDate();
    const dateString = format(logDate, 'yyyy-MM-dd');
    if (dailyCounts.hasOwnProperty(dateString)) {
         dailyCounts[dateString] = (dailyCounts[dateString] || 0) + 1;
    }
  });
  
  const chartData = Object.entries(dailyCounts)
    .map(([dateString, count]) => ({
      rawDate: dateString, // Keep YYYY-MM-DD for sorting
      name: format(new Date(dateString + 'T00:00:00'), 'MMM d'), // User-friendly display name
      conversions: count,
    }))
    .sort((a,b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()) // Sort by actual date
    .map(item => ({ name: item.name, conversions: item.conversions })); // Final format

  return chartData;
}
