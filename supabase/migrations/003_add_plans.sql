-- Add plan and usage tracking to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan text default 'pro' check (plan in ('starter', 'pro')),
  ADD COLUMN IF NOT EXISTS ai_replies_count int default 0,
  ADD COLUMN IF NOT EXISTS ai_replies_reset_at timestamptz default now();
