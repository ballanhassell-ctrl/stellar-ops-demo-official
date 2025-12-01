// Supabase Edge Function: aggregate-monthly-metrics
// Deploy: supabase functions deploy aggregate-monthly-metrics
// Schedule: Set up in Supabase Dashboard -> Edge Functions -> Cron

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MetricAggregation {
  field_key: string;
  year: number;
  month: number;
  month_name: string;
  value: number;
  goal_value: number;
}

/**
 * Aggregates daily metrics into monthly totals
 * Handles new patients, revenue, and other metrics that should be summed monthly
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body for parameters
    const { metric, months = 6, force = false } = await req.json().catch(() => ({}))

    // Default to aggregating new patients if no metric specified
    const metricsToAggregate = metric ? [metric] : ['eod_new_patients']

    const results: any[] = []

    // Process each metric
    for (const fieldKey of metricsToAggregate) {
      console.log(`Aggregating ${fieldKey} for last ${months} months...`)

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      startDate.setDate(1) // First day of start month

      // Get all daily values for this metric in the date range
      const { data: dailyValues, error: fetchError } = await supabase
        .from('csd_metric_values')
        .select('as_of_date, value')
        .eq('field_key', fieldKey)
        .gte('as_of_date', startDate.toISOString().split('T')[0])
        .lte('as_of_date', endDate.toISOString().split('T')[0])
        .order('as_of_date', { ascending: true })

      if (fetchError) {
        console.error(`Error fetching ${fieldKey}:`, fetchError)
        continue
      }

      console.log(`Found ${dailyValues?.length || 0} daily records for ${fieldKey}`)

      // Group by month and sum
      const monthlyTotals = new Map<string, number>()
      const monthlyRecordCounts = new Map<string, number>()

      dailyValues?.forEach((record) => {
        const date = new Date(record.as_of_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        const currentTotal = monthlyTotals.get(monthKey) || 0
        const currentCount = monthlyRecordCounts.get(monthKey) || 0

        monthlyTotals.set(monthKey, currentTotal + (record.value || 0))
        monthlyRecordCounts.set(monthKey, currentCount + 1)
      })

      console.log(`Aggregated into ${monthlyTotals.size} months`)

      // Prepare data for upsert
      const aggregations: MetricAggregation[] = []

      // Generate entries for each month in range (even if no data)
      for (let i = 0; i < months; i++) {
        const date = new Date()
        date.setMonth(date.getMonth() - (months - 1 - i))
        date.setDate(1)

        const year = date.getFullYear()
        const month = date.getMonth() + 1
        const monthKey = `${year}-${String(month).padStart(2, '0')}`
        const monthName = date.toLocaleString('en-US', { month: 'short', year: 'numeric' })

        const value = monthlyTotals.get(monthKey) || 0
        const recordCount = monthlyRecordCounts.get(monthKey) || 0

        console.log(`${monthName}: ${value} (from ${recordCount} daily records)`)

        // Only update if we have data OR if force flag is set
        if (value > 0 || force) {
          aggregations.push({
            field_key: fieldKey,
            year,
            month,
            month_name: monthName,
            value,
            goal_value: 0, // Can be set based on business logic
          })
        }
      }

      // Upsert to monthly_metric_trends
      if (aggregations.length > 0) {
        const { data: upsertData, error: upsertError } = await supabase
          .from('monthly_metric_trends')
          .upsert(aggregations, {
            onConflict: 'field_key,year,month',
            ignoreDuplicates: false, // Update existing records
          })
          .select()

        if (upsertError) {
          console.error(`Error upserting ${fieldKey}:`, upsertError)
          results.push({
            metric: fieldKey,
            success: false,
            error: upsertError.message,
          })
        } else {
          console.log(`Successfully aggregated ${aggregations.length} months for ${fieldKey}`)
          results.push({
            metric: fieldKey,
            success: true,
            monthsProcessed: aggregations.length,
            aggregations: aggregations.map(a => ({
              month: a.month_name,
              value: a.value,
            })),
          })
        }
      } else {
        results.push({
          metric: fieldKey,
          success: true,
          monthsProcessed: 0,
          message: 'No data to aggregate',
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
