-- Veille concurrentielle V1
-- competitors: lieux suivis (concurrents + la fiche du gérant lui-même, is_self = true)
-- competitor_snapshots: historique hebdo note / volume d'avis

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade not null,
  name text not null,
  google_place_id text not null,
  is_self boolean not null default false,
  created_at timestamptz default now(),
  unique (establishment_id, google_place_id)
);

alter table public.competitors enable row level security;

drop policy if exists "Owners can manage their competitors" on public.competitors;
create policy "Owners can manage their competitors"
  on public.competitors for all
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

create table if not exists public.competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid references public.competitors(id) on delete cascade not null,
  rating numeric(2,1),
  review_count integer,
  captured_at timestamptz default now()
);

alter table public.competitor_snapshots enable row level security;

-- Lecture par le propriétaire uniquement ; l'écriture passe par le
-- service role (route API + cron), aucune policy d'insertion nécessaire.
drop policy if exists "Owners can read their competitor snapshots" on public.competitor_snapshots;
create policy "Owners can read their competitor snapshots"
  on public.competitor_snapshots for select
  using (
    competitor_id in (
      select c.id from public.competitors c
      join public.establishments e on e.id = c.establishment_id
      where e.user_id = auth.uid()
    )
  );

create index if not exists competitor_snapshots_competitor_idx
  on public.competitor_snapshots (competitor_id, captured_at desc);
