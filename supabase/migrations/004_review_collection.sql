-- Fonctionnalité: Collecte d'avis par QR code
-- Run this in Supabase SQL Editor

-- ── ESTABLISHMENTS: slug + google_review_url + logo_url ───────
alter table public.establishments
  add column if not exists slug text unique,
  add column if not exists google_review_url text,
  add column if not exists logo_url text;

-- Génère un slug à partir d'un nom (minuscules, sans accents, tirets)
create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(unaccent(coalesce(input, ''))),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

-- unaccent est nécessaire pour slugify
create extension if not exists unaccent;

-- Backfill: slug pour les établissements existants (suffixe court si collision)
update public.establishments e
set slug = sub.new_slug
from (
  select id,
    case
      when count(*) over (partition by base) > 1
        then base || '-' || substr(id::text, 1, 4)
      else base
    end as new_slug
  from (
    select id, nullif(public.slugify(name), '') as base
    from public.establishments
    where slug is null
  ) t
  where base is not null
) sub
where e.id = sub.id;

-- Fallback pour les noms vides
update public.establishments
set slug = 'etablissement-' || substr(id::text, 1, 8)
where slug is null;

-- ── FEEDBACKS (avis privés via la page /r/[slug]) ──────────────
create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete cascade not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  status text not null default 'nouveau' check (status in ('nouveau', 'lu', 'traité')),
  created_at timestamptz default now()
);

alter table public.feedbacks enable row level security;

-- Seul le gérant propriétaire lit / met à jour ses feedbacks.
-- L'insertion publique passe par l'API server-side (service role),
-- donc aucune policy anon nécessaire.
create policy "Owners can read their feedbacks"
  on public.feedbacks for select
  using (
    establishment_id in (
      select id from public.establishments where user_id = auth.uid()
    )
  );

create policy "Owners can update their feedbacks"
  on public.feedbacks for update
  using (
    establishment_id in (
      select id from public.establishments where user_id = auth.uid()
    )
  );

create policy "Owners can delete their feedbacks"
  on public.feedbacks for delete
  using (
    establishment_id in (
      select id from public.establishments where user_id = auth.uid()
    )
  );

-- ── handle_new_user: génère aussi le slug ──────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_slug text;
begin
  base_slug := nullif(public.slugify(coalesce(new.raw_user_meta_data->>'business_name', '')), '');
  if base_slug is null then
    base_slug := 'etablissement-' || substr(new.id::text, 1, 8);
  elsif exists (select 1 from public.establishments where slug = base_slug) then
    base_slug := base_slug || '-' || substr(new.id::text, 1, 4);
  end if;

  insert into public.establishments (user_id, name, slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', 'Mon établissement'),
    base_slug
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
