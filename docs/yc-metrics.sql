-- YC / founder metrics starter queries for Neoxra
-- Assumes DATABASE_URL points at the primary Postgres used by backend.

-- 1. Visitors in the last 30 days
select
  count(distinct visitor_id) as visitors_30d
from usage_events
where event_name = 'page_view'
  and visitor_id is not null
  and created_at >= now() - interval '30 days';

-- 2. Demo starts / completions / failures / abandons by source in the last 30 days
select
  coalesce(source, surface, 'unknown') as source,
  count(*) filter (where event_name = 'demo_started') as demo_starts,
  count(*) filter (where event_name = 'demo_completed') as demo_completions,
  count(*) filter (where event_name = 'demo_failed') as demo_failures,
  count(*) filter (where event_name = 'demo_abandoned') as demo_abandons
from usage_events
where event_name in ('demo_started', 'demo_completed', 'demo_failed', 'demo_abandoned')
  and created_at >= now() - interval '30 days'
group by 1
order by demo_starts desc, demo_completions desc;

-- 3. Activation rate
-- Activation = visitor completed at least one demo run.
with visitor_funnel as (
  select
    visitor_id,
    bool_or(event_name = 'demo_started') as started_demo,
    bool_or(event_name = 'demo_completed') as activated
  from usage_events
  where visitor_id is not null
    and event_name in ('demo_started', 'demo_completed')
    and created_at >= now() - interval '30 days'
  group by visitor_id
)
select
  count(*) filter (where started_demo) as visitors_who_started,
  count(*) filter (where activated) as activated_visitors,
  round(
    100.0 * count(*) filter (where activated)
    / nullif(count(*) filter (where started_demo), 0),
    2
  ) as activation_rate_percent
from visitor_funnel;

-- 4. Repeat usage
-- Repeat = visitor completed demos on 2+ distinct days.
with completion_days as (
  select
    visitor_id,
    date(created_at) as completion_day
  from usage_events
  where event_name = 'demo_completed'
    and visitor_id is not null
    and created_at >= now() - interval '30 days'
  group by visitor_id, date(created_at)
)
select
  count(*) as repeat_users_30d
from (
  select visitor_id
  from completion_days
  group by visitor_id
  having count(*) >= 2
) repeat_visitors;

-- 5. Demo conversion by surface
with per_visitor_surface as (
  select
    coalesce(surface, 'unknown') as surface,
    visitor_id,
    bool_or(event_name = 'demo_started') as started_demo,
    bool_or(event_name = 'demo_completed') as completed_demo
  from usage_events
  where visitor_id is not null
    and event_name in ('demo_started', 'demo_completed')
    and created_at >= now() - interval '30 days'
  group by 1, 2
)
select
  surface,
  count(*) filter (where started_demo) as visitors_started,
  count(*) filter (where completed_demo) as visitors_completed,
  round(
    100.0 * count(*) filter (where completed_demo)
    / nullif(count(*) filter (where started_demo), 0),
    2
  ) as completion_rate_percent
from per_visitor_surface
group by surface
order by visitors_started desc;
