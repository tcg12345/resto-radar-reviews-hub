-- 1) Roles enum and user_roles table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','expert','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
-- Allow users to read their roles; allow public to check expert status via SECURITY DEFINER functions anyway
DO $$ BEGIN
  CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) has_role helper
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = _role
  );
$$;

-- 3) Expert applications
DO $$ BEGIN
  CREATE TYPE public.expert_application_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.expert_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  qualifications TEXT,
  credentials TEXT,
  proof_links TEXT[],
  status public.expert_application_status NOT NULL DEFAULT 'pending',
  reviewer_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_applications ENABLE ROW LEVEL SECURITY;

-- Policies: user can insert/select own; only admins can update/approve
DO $$ BEGIN
  CREATE POLICY "Users can create their own expert app"
  ON public.expert_applications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can view their own expert app"
  ON public.expert_applications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update expert applications"
  ON public.expert_applications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_expert_app_updated
  BEFORE UPDATE ON public.expert_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- When an application is approved, grant expert role and make profile public
CREATE OR REPLACE FUNCTION public.handle_expert_status_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'expert')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Make profile public
    UPDATE public.profiles SET is_public = true WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status <> 'approved' THEN
    -- Remove expert role if revoked
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id AND role = 'expert';
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_expert_status_update
  AFTER UPDATE OF status ON public.expert_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_expert_status_update();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Friends-only and Expert-only reviews for a place
-- Modeled after existing get_restaurant_reviews, but filtered
CREATE OR REPLACE FUNCTION public.get_friend_reviews_for_place(
  place_id_param text,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0,
  requesting_user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE(
  review_id text,
  user_id uuid,
  username text,
  avatar_url text,
  overall_rating numeric,
  category_ratings jsonb,
  review_text text,
  photos text[],
  photo_captions text[],
  photo_dish_names text[],
  created_at timestamptz,
  source_type text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE WHEN f.user1_id = requesting_user_id THEN f.user2_id ELSE f.user1_id END AS fid
    FROM public.friends f
    WHERE f.user1_id = requesting_user_id OR f.user2_id = requesting_user_id
  ),
  combined_reviews AS (
    SELECT 
      ur.id::text as review_id,
      ur.user_id,
      ur.overall_rating::numeric as overall_rating,
      ur.category_ratings,
      ur.review_text,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      'user_review' as source_type
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    SELECT 
      r.id::text as review_id,
      r.user_id,
      r.rating::numeric as overall_rating,
      r.category_ratings,
      r.notes as review_text,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      'personal_rating' as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false
      AND r.google_place_id = place_id_param
  )
  SELECT 
    cr.review_id,
    cr.user_id,
    COALESCE(p.username, 'Anonymous') as username,
    p.avatar_url,
    cr.overall_rating,
    cr.category_ratings,
    cr.review_text,
    cr.photos,
    cr.photo_captions,
    cr.photo_dish_names,
    cr.created_at,
    cr.source_type
  FROM combined_reviews cr
  JOIN friend_ids f ON f.fid = cr.user_id
  LEFT JOIN public.profiles p ON p.id = cr.user_id
  ORDER BY cr.created_at DESC
  LIMIT page_limit OFFSET page_offset;
END; $$;

CREATE OR REPLACE FUNCTION public.get_expert_reviews_for_place(
  place_id_param text,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0
)
RETURNS TABLE(
  review_id text,
  user_id uuid,
  username text,
  avatar_url text,
  overall_rating numeric,
  category_ratings jsonb,
  review_text text,
  photos text[],
  photo_captions text[],
  photo_dish_names text[],
  created_at timestamptz,
  source_type text
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH expert_ids AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'expert'
  ),
  combined_reviews AS (
    SELECT 
      ur.id::text as review_id,
      ur.user_id,
      ur.overall_rating::numeric as overall_rating,
      ur.category_ratings,
      ur.review_text,
      ur.photos,
      ur.photo_captions,
      ur.photo_dish_names,
      ur.created_at,
      'user_review' as source_type
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param

    UNION ALL

    SELECT 
      r.id::text as review_id,
      r.user_id,
      r.rating::numeric as overall_rating,
      r.category_ratings,
      r.notes as review_text,
      r.photos,
      r.photo_captions,
      r.photo_dish_names,
      r.created_at,
      'personal_rating' as source_type
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false
      AND r.google_place_id = place_id_param
  )
  SELECT 
    cr.review_id,
    cr.user_id,
    COALESCE(p.username, 'Anonymous') as username,
    p.avatar_url,
    cr.overall_rating,
    cr.category_ratings,
    cr.review_text,
    cr.photos,
    cr.photo_captions,
    cr.photo_dish_names,
    cr.created_at,
    cr.source_type
  FROM combined_reviews cr
  JOIN expert_ids e ON e.user_id = cr.user_id
  LEFT JOIN public.profiles p ON p.id = cr.user_id
  ORDER BY cr.created_at DESC
  LIMIT page_limit OFFSET page_offset;
END; $$;

-- Fast stats helpers
CREATE OR REPLACE FUNCTION public.get_friend_rating_stats(place_id_param text, requesting_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(avg_rating numeric, total_reviews integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH friend_ids AS (
    SELECT CASE WHEN f.user1_id = requesting_user_id THEN f.user2_id ELSE f.user1_id END AS fid
    FROM public.friends f
    WHERE f.user1_id = requesting_user_id OR f.user2_id = requesting_user_id
  ),
  ratings AS (
    SELECT ur.user_id, ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
    UNION ALL
    SELECT r.user_id, r.rating::numeric AS rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id = place_id_param
  )
  SELECT ROUND(AVG(r.rating)::numeric, 2), COUNT(*)
  FROM ratings r
  JOIN friend_ids f ON f.fid = r.user_id;
END; $$;

CREATE OR REPLACE FUNCTION public.get_expert_rating_stats(place_id_param text)
RETURNS TABLE(avg_rating numeric, total_reviews integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  WITH expert_ids AS (
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'expert'
  ),
  ratings AS (
    SELECT ur.user_id, ur.overall_rating::numeric AS rating
    FROM public.user_reviews ur
    WHERE ur.restaurant_place_id = place_id_param
    UNION ALL
    SELECT r.user_id, r.rating::numeric AS rating
    FROM public.restaurants r
    WHERE r.rating IS NOT NULL AND r.is_wishlist = false AND r.google_place_id = place_id_param
  )
  SELECT ROUND(AVG(r.rating)::numeric, 2), COUNT(*)
  FROM ratings r
  JOIN expert_ids e ON e.user_id = r.user_id;
END; $$;
