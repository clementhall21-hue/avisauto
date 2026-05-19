-- AvisAuto — Initial Schema
-- Run this in Supabase SQL Editor

-- ── ESTABLISHMENTS ────────────────────────────────────────────
create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Mon établissement',
  signature text default '',
  tone text default 'Professionnel',
  auto_mode boolean default false,
  publish_delay_sec integer default 0,
  groq_api_key text,
  zapier_webhook_url text,
  zapier_triggers jsonb default '{"new_review":true,"negative":true,"published":false}'::jsonb,
  created_at timestamptz default now()
);

alter table public.establishments enable row level security;

create policy "Users can manage their own establishment"
  on public.establishments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── REVIEWS ───────────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade not null,
  reviewer_name text not null,
  reviewer_initials text,
  reviewer_color text default '#dbeafe',
  reviewer_text_color text default '#1e40af',
  stars integer not null check (stars between 1 and 5),
  review_text text not null,
  review_date text default 'Récemment',
  status text default 'pending' check (status in ('pending', 'scheduled', 'published')),
  ai_reply text,
  published_at timestamptz,
  scheduled_at timestamptz,
  source text default 'manual',
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;

create policy "Users can manage reviews of their establishment"
  on public.reviews for all
  using (
    establishment_id in (
      select id from public.establishments where user_id = auth.uid()
    )
  )
  with check (
    establishment_id in (
      select id from public.establishments where user_id = auth.uid()
    )
  );

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'trialing' check (status in ('trialing', 'active', 'canceled', 'past_due', 'incomplete')),
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_end timestamptz,
  created_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can read their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Service role can write subscriptions (for Stripe webhooks)
create policy "Service role can manage subscriptions"
  on public.subscriptions for all
  using (true)
  with check (true);

-- ── FUNCTION: auto-create establishment on signup ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.establishments (user_id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', 'Mon établissement')
  );

  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (
    new.id,
    'trialing',
    now() + interval '14 days'
  );

  return new;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
