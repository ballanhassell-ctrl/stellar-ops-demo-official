import { useEffect, useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { ARSnapshot } from '../types/database.types';
import {
  getARSnapshots,
  calculateTrends,
  calculateSnapshotDelta,
  type ARTrendPoint,
} from '../services/arSnapshotService';

interface ARAgingChartProps {
  isDayMode: boolean;
}

type DateRange = '3m' | '6m' | '1y' | 'all';

function formatDollar(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatYAxisTick(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value}`;
}

function filterSnapshotsByRange(
  snapshots: ARSnapshot[],
  range: DateRange
): ARSnapshot[] {
  if (range === 'all') return snapshots;

  const now = new Date();
  let cutoff: Date;

  switch (range) {
    case '3m':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      break;
    case '6m':
      cutoff = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      break;
    case '1y':
      cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      return snapshots;
  }

  const cutoffStr = cutoff.toISOString().split('T')[0];
  return snapshots.filter((s) => s.snapshot_date >= cutoffStr);
}

// Custom tooltip for the combined trend line chart
function CombinedTrendTooltip({
  active,
  payload,
  label,
  isDayMode,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isDayMode: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className={`rounded-lg shadow-lg border p-3 ${
        isDayMode
          ? 'bg-white border-gray-200 text-gray-900'
          : 'bg-gray-800 border-gray-700 text-white'
      }`}
    >
      <p className="font-semibold text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium">{formatDollar(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// Custom tooltip for the patient aging stacked bar chart
function PatientAgingTooltip({
  active,
  payload,
  label,
  isDayMode,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  isDayMode: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div
      className={`rounded-lg shadow-lg border p-3 ${
        isDayMode
          ? 'bg-white border-gray-200 text-gray-900'
          : 'bg-gray-800 border-gray-700 text-white'
      }`}
    >
      <p className="font-semibold text-sm mb-2">{label} &mdash; Patient A/R</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-medium">{formatDollar(entry.value)}</span>
        </div>
      ))}
      <div
        className={`mt-2 pt-2 border-t flex items-center justify-between text-sm font-semibold ${
          isDayMode ? 'border-gray-200' : 'border-gray-600'
        }`}
      >
        <span>Total</span>
        <span>{formatDollar(total)}</span>
      </div>
    </div>
  );
}


export default function ARAgingChart({ isDayMode }: ARAgingChartProps) {
  const [snapshots, setSnapshots] = useState<ARSnapshot[]>([]);
  const [trendData, setTrendData] = useState<ARTrendPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('6m');
  const [delta, setDelta] = useState<ReturnType<typeof calculateSnapshotDelta> | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const allSnapshots = await getARSnapshots();
      setSnapshots(allSnapshots);

      const filtered = filterSnapshotsByRange(allSnapshots, dateRange);
      const trends = calculateTrends(filtered);
      setTrendData(trends);

      // Calculate period-over-period delta from the two most recent snapshots
      const sorted = [...allSnapshots].sort((a, b) =>
        b.snapshot_date.localeCompare(a.snapshot_date)
      );
      if (sorted.length >= 2) {
        const d = calculateSnapshotDelta(sorted[0], sorted[1]);
        setDelta(d);
      } else {
        setDelta(null);
      }
    } catch (err) {
      console.error('Error loading A/R snapshots:', err);
      setError('Failed to load A/R snapshot data.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recompute trends when dateRange changes using already-loaded snapshots
  useEffect(() => {
    if (snapshots.length > 0) {
      const filtered = filterSnapshotsByRange(snapshots, dateRange);
      const trends = calculateTrends(filtered);
      setTrendData(trends);
    }
  }, [dateRange, snapshots]);

  const bgColor = isDayMode ? 'bg-white' : 'bg-gray-900';
  const textColor = isDayMode ? 'text-gray-900' : 'text-white';
  const subtextColor = isDayMode ? 'text-gray-500' : 'text-gray-400';
  const borderColor = isDayMode ? 'border-gray-200' : 'border-gray-700';
  const gridStroke = isDayMode ? '#e5e7eb' : '#374151';
  const axisTickColor = isDayMode ? '#6b7280' : '#9ca3af';

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last 1 Year' },
    { value: 'all', label: 'All Time' },
  ];

  if (loading) {
    return (
      <div className={`${bgColor} rounded-lg shadow-sm p-6`}>
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${bgColor} rounded-lg shadow-sm p-6`}>
        <div className={`text-center ${subtextColor}`}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (trendData.length === 0) {
    return (
      <div className={`${bgColor} rounded-lg shadow-sm p-6`}>
        <div className={`text-center ${subtextColor}`}>
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No A/R snapshot data available.</p>
          <p className="text-sm mt-1">
            Snapshots are generated on the 1st and 15th of each month.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with date range selector */}
      <div className={`${bgColor} rounded-lg shadow-sm border ${borderColor} p-5`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className={`w-6 h-6 ${isDayMode ? 'text-blue-600' : 'text-blue-400'}`} />
            <div>
              <h2 className={`text-lg font-semibold ${textColor}`}>
                A/R Aging Trends
              </h2>
              <p className={`text-sm ${subtextColor}`}>
                Bi-monthly snapshots showing A/R changes over time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className={`w-4 h-4 ${subtextColor}`} />
            <div className="flex rounded-lg overflow-hidden border ${borderColor}">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    dateRange === option.value
                      ? isDayMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-500 text-white'
                      : isDayMode
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Period-over-Period Summary */}
      {delta && (
        <div className={`${bgColor} rounded-lg shadow-sm border ${borderColor} p-5`}>
          <h3 className={`text-sm font-semibold ${subtextColor} uppercase tracking-wider mb-4`}>
            Period-over-Period Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Patient A/R Change */}
            <div
              className={`rounded-lg border p-4 ${borderColor} ${
                isDayMode ? 'bg-gray-50' : 'bg-gray-800'
              }`}
            >
              <p className={`text-xs font-medium ${subtextColor} mb-1`}>Patient A/R</p>
              <div className="flex items-center gap-2">
                {delta.patientARChange <= 0 ? (
                  <ArrowDownRight className="w-5 h-5 text-green-500" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                )}
                <span
                  className={`text-lg font-bold ${
                    delta.patientARChange <= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {formatDollar(Math.abs(delta.patientARChange))}
                </span>
              </div>
              <p
                className={`text-xs mt-1 ${
                  delta.patientARChange <= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {delta.patientARChange <= 0 ? (
                  <TrendingDown className="inline w-3 h-3 mr-1" />
                ) : (
                  <TrendingUp className="inline w-3 h-3 mr-1" />
                )}
                {delta.patientARChangePct >= 0 ? '+' : ''}
                {delta.patientARChangePct.toFixed(1)}% from previous
              </p>
            </div>

            {/* Insurance A/R Change */}
            <div
              className={`rounded-lg border p-4 ${borderColor} ${
                isDayMode ? 'bg-gray-50' : 'bg-gray-800'
              }`}
            >
              <p className={`text-xs font-medium ${subtextColor} mb-1`}>Insurance A/R</p>
              <p className={`text-sm font-semibold ${subtextColor} italic mt-2`}>
                Calculated on the 1st &amp; 15th
              </p>
            </div>

            {/* Combined Change */}
            <div
              className={`rounded-lg border p-4 ${borderColor} ${
                isDayMode ? 'bg-gray-50' : 'bg-gray-800'
              }`}
            >
              <p className={`text-xs font-medium ${subtextColor} mb-1`}>Combined A/R</p>
              <p className={`text-sm font-semibold ${subtextColor} italic mt-2`}>
                Calculated on the 1st &amp; 15th
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Combined A/R Trend Line Chart */}
      <div className={`${bgColor} rounded-lg shadow-sm border ${borderColor} p-5`}>
        <h3 className={`text-base font-semibold ${textColor} mb-4`}>
          Combined A/R Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisTickColor, fontSize: 12 }}
              tickLine={{ stroke: axisTickColor }}
            />
            <YAxis
              tickFormatter={formatYAxisTick}
              tick={{ fill: axisTickColor, fontSize: 12 }}
              tickLine={{ stroke: axisTickColor }}
            />
            <Tooltip content={<CombinedTrendTooltip isDayMode={isDayMode} />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: axisTickColor }}
            />
            <Line
              type="monotone"
              dataKey="patientAR"
              name="Patient A/R"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="insuranceAR"
              name="Insurance A/R (1st & 15th only)"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#f97316' }}
              activeDot={{ r: 6 }}
              hide
            />
            <Line
              type="monotone"
              dataKey="combinedAR"
              name="Combined Total (1st & 15th only)"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#9ca3af' }}
              activeDot={{ r: 5 }}
              hide
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Patient A/R Aging Breakdown Stacked Bar Chart */}
      <div className={`${bgColor} rounded-lg shadow-sm border ${borderColor} p-5`}>
        <h3 className={`text-base font-semibold ${textColor} mb-4`}>
          Patient A/R Aging Breakdown
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisTickColor, fontSize: 12 }}
              tickLine={{ stroke: axisTickColor }}
            />
            <YAxis
              tickFormatter={formatYAxisTick}
              tick={{ fill: axisTickColor, fontSize: 12 }}
              tickLine={{ stroke: axisTickColor }}
            />
            <Tooltip content={<PatientAgingTooltip isDayMode={isDayMode} />} />
            <Legend wrapperStyle={{ fontSize: 12, color: axisTickColor }} />
            <Bar dataKey="patient_0_30" name="0-30 Days" stackId="patient" fill="#22c55e" />
            <Bar dataKey="patient_31_60" name="31-60 Days" stackId="patient" fill="#eab308" />
            <Bar dataKey="patient_61_90" name="61-90 Days" stackId="patient" fill="#f97316" />
            <Bar dataKey="patient_91_plus" name="91+ Days" stackId="patient" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insurance A/R Aging Breakdown */}
      <div className={`${bgColor} rounded-lg shadow-sm border ${borderColor} p-5`}>
        <h3 className={`text-base font-semibold ${textColor} mb-4`}>
          Insurance A/R Aging Breakdown
        </h3>
        <div className={`flex flex-col items-center justify-center py-12 ${subtextColor}`}>
          <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
          <p className="font-medium text-sm">Insurance A/R is calculated on the 1st &amp; 15th of each month</p>
          <p className="text-xs mt-1 opacity-70">Next update will reflect the latest reconciled balances</p>
        </div>
      </div>
    </div>
  );
}
