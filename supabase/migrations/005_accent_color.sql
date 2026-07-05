-- Couleur d'accent personnalisable pour la page publique /r/[slug]
alter table public.establishments
  add column if not exists accent_color text default '#E4572E';
