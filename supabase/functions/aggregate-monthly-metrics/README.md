# Monthly Metrics Aggregation Edge Function

Automatically aggregates daily metrics into monthly totals in the `monthly_metric_trends` table.

## Features

- ✅ Aggregates daily `eod_new_patients` values into monthly totals
- ✅ Calculates last N months (default: 6 months)
- ✅ Handles missing months gracefully (inserts 0 if no data)
- ✅ Updates existing records (upserts based on field_key, year, month)
- ✅ Can be scheduled to run automatically
- ✅ Supports multiple metrics

## Deployment

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link to your project

```bash
supabase link --project-ref your-project-ref
```

### 4. Deploy the function

```bash
supabase functions deploy aggregate-monthly-metrics
```

## Usage

### Manual Invocation

Call the function manually via HTTP:

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/aggregate-monthly-metrics' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### With Parameters

```bash
curl -X POST 'https://your-project-ref.supabase.co/functions/v1/aggregate-monthly-metrics' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "metric": "eod_new_patients",
    "months": 12,
    "force": false
  }'
```

**Parameters:**
- `metric`: Specific metric to aggregate (default: "eod_new_patients")
- `months`: Number of months to aggregate (default: 6)
- `force`: Update months even if they have 0 value (default: false)

### Schedule with Cron (Recommended)

#### Option 1: Supabase Dashboard
1. Go to Supabase Dashboard → Database → Extensions
2. Enable `pg_cron` extension
3. Run this SQL:

```sql
-- Schedule to run daily at 1 AM UTC
SELECT cron.schedule(
  'aggregate-monthly-metrics-daily',
  '0 1 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/aggregate-monthly-metrics',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);
```

#### Option 2: External Cron Service
Use services like:
- **Cron-job.org**: Free, easy to set up
- **GitHub Actions**: Version-controlled workflows
- **Railway Cron**: Integrated with your deployments

Example GitHub Actions workflow:

```yaml
# .github/workflows/aggregate-metrics.yml
name: Aggregate Monthly Metrics

on:
  schedule:
    - cron: '0 1 * * *' # Daily at 1 AM UTC

jobs:
  aggregate:
    runs-on: ubuntu-latest
    steps:
      - name: Call aggregation function
        run: |
          curl -X POST '${{ secrets.SUPABASE_URL }}/functions/v1/aggregate-monthly-metrics' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```

## Response Format

```json
{
  "success": true,
  "timestamp": "2025-12-01T06:30:00.000Z",
  "results": [
    {
      "metric": "eod_new_patients",
      "success": true,
      "monthsProcessed": 6,
      "aggregations": [
        { "month": "Jul 2025", "value": 23 },
        { "month": "Aug 2025", "value": 18 },
        { "month": "Sep 2025", "value": 26 },
        { "month": "Oct 2025", "value": 29 },
        { "month": "Nov 2025", "value": 22 },
        { "month": "Dec 2025", "value": 10 }
      ]
    }
  ]
}
```

## How It Works

1. **Fetches Daily Values**: Retrieves all `eod_new_patients` records for the last 6 months
2. **Groups by Month**: Sums daily values into monthly totals
3. **Upserts to Table**: Updates `monthly_metric_trends` with aggregated data
4. **Handles Gaps**: Creates entries for months with 0 data (if `force: true`)

## Adding More Metrics

To aggregate additional metrics, modify the function call:

```javascript
// Aggregate multiple metrics
{
  "metrics": ["eod_new_patients", "active_patients", "bam_current_revenue"],
  "months": 12
}
```

Or update the default list in the Edge Function code:

```typescript
const metricsToAggregate = metric ? [metric] : [
  'eod_new_patients',
  'active_patients',
  'bam_current_revenue'
]
```

## Monitoring

View function logs in Supabase Dashboard:
1. Go to **Edge Functions**
2. Click **aggregate-monthly-metrics**
3. View **Logs** tab

## Troubleshooting

### Function fails with "supabase-js not found"
- Ensure you're using the correct Deno import URL
- Check that Supabase CLI is up to date

### No data gets aggregated
- Verify `csd_metric_values` table has data for the date range
- Check that `field_key` matches exactly (case-sensitive)
- Use `force: true` to see diagnostic output

### Existing data gets overwritten
- This is expected behavior - the function updates existing monthly records
- To preserve manual entries, modify the function to check before overwriting

## Best Practices

1. **Run Daily**: Schedule to run at the end of each day (1-2 AM)
2. **Monitor Logs**: Check logs weekly to ensure successful runs
3. **Backup Data**: Periodically backup `monthly_metric_trends` table
4. **Validate Results**: Compare aggregated values with manual calculations initially
5. **Handle Gaps**: Decide whether months with no data should show 0 or be omitted

## Cost Considerations

- Edge Function invocations: Free tier includes 500K requests/month
- Each run processes ~6 months × 1 metric = minimal cost
- Daily scheduling = ~30 invocations/month (well within free tier)

## Future Enhancements

- [ ] Support for averaging instead of summing (for metrics like collection_rate)
- [ ] Automatic goal calculation based on targets
- [ ] Email notifications on completion
- [ ] Slack/Discord integration for alerts
- [ ] Historical data backfill capability
- [ ] Support for custom date ranges
