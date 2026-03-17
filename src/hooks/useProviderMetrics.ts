import { useState, useEffect } from 'react';
import { getMetricsForDate, type MetricWithValue } from '../services/metrics';

export interface ProviderProductionData {
  drPatel: number;
  drNovak: number;
  drChen: number;
  doctorTotal: number;
  nadia: number;
  lily: number;
  maya: number;
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
        const metric = metrics.find((m: MetricWithValue) => m.field_key === fieldKey);
        return metric ? metric.value : defaultValue;
      };

      // Get individual provider values
      const drPatel = getMetricValue('provider_dr_patel');
      const drNovak = getMetricValue('provider_dr_novak');
      const drChen = getMetricValue('provider_dr_chen');
      const nadia = getMetricValue('provider_nadia');
      const lily = getMetricValue('provider_lily');
      const maya = getMetricValue('provider_maya');
      const tempHyg = getMetricValue('provider_temp_hyg');

      // Calculate totals
      const doctorTotal = drPatel + drNovak + drChen;
      const hygienistTotal = nadia + lily + maya + tempHyg;
      const combinedTotal = doctorTotal + hygienistTotal;

      const mappedData: ProviderProductionData = {
        drPatel,
        drNovak,
        drChen,
        doctorTotal,
        nadia,
        lily,
        maya,
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
