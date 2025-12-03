// src/hooks/useWeeklyScorecardData.ts
import { useState, useEffect } from 'react';
import { getWeeklyScorecardData } from '../services/metrics';

export interface WeeklyScorecardDataPoint {
  week: number;
  date: string;
  showRateDr: number;
  showRateHyg: number;
  newPts: number;
  txPresented: number;
  txAcceptPct: number;
  txAccepted: number;
  collectionPct: number;
  fiveStars: number;
}

export const useWeeklyScorecardData = (numWeeks: number = 12) => {
  const [data, setData] = useState<WeeklyScorecardDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const weeklyData = await getWeeklyScorecardData(numWeeks);
      setData(weeklyData);
    } catch (err) {
      console.error('Error fetching weekly scorecard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch weekly scorecard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [numWeeks]);

  const refresh = () => {
    fetchData();
  };

  return { data, loading, error, refresh };
};
