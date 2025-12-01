import { useState, useEffect } from 'react';
import { getNewPatientsByMonth, getNewPatientsAggregates } from '../services/metrics';

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

      // Fetch aggregated data and monthly trends in parallel
      const [aggregates, monthlyData] = await Promise.all([
        getNewPatientsAggregates(),
        getNewPatientsByMonth(6)
      ]);

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
