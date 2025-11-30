import { useState, useEffect } from 'react';
import { getMetricsForDate } from '../services/metrics';

export interface ProviderProductionData {
  drGajjar: number;
  drJudge: number;
  drStrachan: number;
  doctorTotal: number;
  farah: number;
  olga: number;
  jissel: number;
  tempHyg: number;
  hygienistTotal: number;
  combinedTotal: number;
}

export const useProviderMetrics = (date: string) => {
  const [data, setData] = useState<ProviderProductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviderMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const metrics = await getMetricsForDate(date);

      // Helper function to find metric value by field_key
      const getMetricValue = (fieldKey: string, defaultValue: number = 0): number => {
        const metric = metrics.find(m => m.field_key === fieldKey);
        return metric ? metric.value : defaultValue;
      };

      // Get individual provider values
      const drGajjar = getMetricValue('provider_dr_gajjar');
      const drJudge = getMetricValue('provider_dr_judge');
      const drStrachan = getMetricValue('provider_dr_strachan');
      const farah = getMetricValue('provider_farah');
      const olga = getMetricValue('provider_olga');
      const jissel = getMetricValue('provider_jissel');
      const tempHyg = getMetricValue('provider_temp_hyg');

      // Calculate totals
      const doctorTotal = drGajjar + drJudge + drStrachan;
      const hygienistTotal = farah + olga + jissel + tempHyg;
      const combinedTotal = doctorTotal + hygienistTotal;

      const mappedData: ProviderProductionData = {
        drGajjar,
        drJudge,
        drStrachan,
        doctorTotal,
        farah,
        olga,
        jissel,
        tempHyg,
        hygienistTotal,
        combinedTotal,
      };

      setData(mappedData);
    } catch (err) {
      console.error('Error fetching provider metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch provider metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderMetrics();
  }, [date]);

  const refresh = () => {
    fetchProviderMetrics();
  };

  return { data, loading, error, refresh };
};
