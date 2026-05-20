-- Add 'snoozed' to allowed review statuses
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_status_check;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_status_check
  CHECK (status IN ('pending', 'scheduled', 'published', 'snoozed'));
