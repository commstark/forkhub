-- Add org_id to reviews table for defense-in-depth org isolation
-- Run this in your Supabase SQL Editor

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.orgs(id);
UPDATE public.reviews SET org_id = (SELECT org_id FROM public.tools WHERE tools.id = reviews.tool_id);
ALTER TABLE public.reviews ALTER COLUMN org_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_org ON public.reviews(org_id);
