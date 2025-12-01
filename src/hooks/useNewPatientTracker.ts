import { useState, useEffect } from 'react';
import { getNewPatientsByMonth, getNewPatientsAggregates, getMonthlyTrends } from '../services/metrics';

export interface NewPatientTrackerData {
  perDay: number;
  perDayGoal: number;
  perWeek: number;
  perWeekGoal: number;
  perMonth: number;
  perMonthGoal: number;
  quarterly: number;
  quarterlyGoal: number;
  monthlyAverages: Array<{ month: string; count: number }>;
}

export const useNewPatientTracker = (dailyCount: number) => {
  const [data, setData] = useState<NewPatientTrackerData>({
    perDay: dailyCount,
    perDayGoal: 2,
    perWeek: 0,
    perWeekGoal: 10,
    perMonth: 0,
    perMonthGoal: 40,
    quarterly: 0,
    quarterlyGoal: 120,
    monthlyAverages: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNewPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to fetch from monthly_metric_trends table first (faster)
      let monthlyData = await getMonthlyTrends('eod_new_patients', 6);

      // If monthly trends table doesn't have data, fall back to daily aggregation
      if (monthlyData.length === 0) {
        console.log('No data in monthly_metric_trends, aggregating from daily values');
        const dailyMonthlyData = await getNewPatientsByMonth(6);
        monthlyData = dailyMonthlyData.map(m => ({
          month: m.month,
          year: m.year,
          count: m.count,
          goal: 40 // Default monthly goal
        }));
      }

      // Fetch aggregated data for week/month/quarter
      const aggregates = await getNewPatientsAggregates();

      setData({
        perDay: dailyCount,
        perDayGoal: 2,
        perWeek: aggregates.perWeek,
        perWeekGoal: 10,
        perMonth: aggregates.perMonth,
        perMonthGoal: 40,
        quarterly: aggregates.quarterly,
        quarterlyGoal: 120,
        monthlyAverages: monthlyData.map(m => ({ month: m.month, count: m.count }))
      });
    } catch (err) {
      console.error('Error fetching new patient tracker data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch new patient data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewPatientData();
  }, []);

  // Update perDay when dailyCount changes
  useEffect(() => {
    setData(prev => ({ ...prev, perDay: dailyCount }));
  }, [dailyCount]);

  const refresh = () => {
    fetchNewPatientData();
  };

  return { data, loading, error, refresh };
};
