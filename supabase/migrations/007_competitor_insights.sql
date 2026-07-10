-- Analyses concurrentielles générées automatiquement (cron hebdo)
create table if not exists public.competitor_insights (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade not null,
  insight text not null,
  created_at timestamptz default now()
);

alter table public.competitor_insights enable row level security;

-- Lecture par le propriétaire ; écriture via service role uniquement
drop policy if exists "Owners can read their competitor insights" on public.competitor_insights;
create policy "Owners can read their competitor insights"
  on public.competitor_insights for select
  using (
    establishment_id in (
      select id from public.establishments where user_id = auth.uid()
    )
  );

create index if not exists competitor_insights_establishment_idx
  on public.competitor_insights (establishment_id, created_at desc);
