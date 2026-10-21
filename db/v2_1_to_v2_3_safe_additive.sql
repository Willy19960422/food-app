-- ShiYang v2.1–2.3 additive, no existing user rows deleted.
-- Preserve legitimate zero; unknown macro values are NULL, never made up.
BEGIN;
ALTER TABLE public.diet_logs ALTER COLUMN protein DROP NOT NULL;
ALTER TABLE public.diet_logs ALTER COLUMN fat DROP NOT NULL;
ALTER TABLE public.diet_logs ALTER COLUMN carbs DROP NOT NULL;
ALTER TABLE public.diet_logs ALTER COLUMN protein DROP DEFAULT;
ALTER TABLE public.diet_logs ALTER COLUMN fat DROP DEFAULT;
ALTER TABLE public.diet_logs ALTER COLUMN carbs DROP DEFAULT;
ALTER TABLE public.diet_logs ADD COLUMN IF NOT EXISTS nutrition_source text NOT NULL DEFAULT 'legacy'
 CHECK (nutrition_source IN ('legacy','quick_kcal','catalog','scanned','ai_estimate','manual'));
CREATE INDEX IF NOT EXISTS diet_logs_user_date_idx ON public.diet_logs(user_id,date DESC);
CREATE INDEX IF NOT EXISTS custom_foods_owner_idx ON public.custom_foods(created_by);
-- Only logged-in user may access his or her own cloud food preferences.
CREATE TABLE IF NOT EXISTS public.food_user_state (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 favorites jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(favorites)='array'),
 combos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(combos)='array'),
 daily_targets jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(daily_targets)='object'),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.food_user_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_user_state FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.food_user_state TO authenticated;
CREATE POLICY "food_user_state_own_select" ON public.food_user_state FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY "food_user_state_own_insert" ON public.food_user_state FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()));
CREATE POLICY "food_user_state_own_update" ON public.food_user_state FOR UPDATE TO authenticated
 USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
CREATE POLICY "food_user_state_own_delete" ON public.food_user_state FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
-- Weight trend is optional; no inferred measurements.
CREATE TABLE IF NOT EXISTS public.food_weight_logs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
 measured_on date NOT NULL,
 kg numeric(5,2) NOT NULL CHECK(kg>=20 AND kg<=350),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,measured_on)
);
CREATE INDEX IF NOT EXISTS food_weight_logs_user_date_idx ON public.food_weight_logs(user_id,measured_on DESC);
ALTER TABLE public.food_weight_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_weight_logs FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.food_weight_logs TO authenticated;
CREATE POLICY "food_weight_logs_own_read" ON public.food_weight_logs FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY "food_weight_logs_own_insert" ON public.food_weight_logs FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()));
CREATE POLICY "food_weight_logs_own_update" ON public.food_weight_logs FOR UPDATE TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
CREATE POLICY "food_weight_logs_own_delete" ON public.food_weight_logs FOR DELETE TO authenticated USING(user_id=(SELECT auth.uid()));
-- Admin access is service-role only. Front-end user_metadata is NEVER trusted for admin privileges.
CREATE TABLE IF NOT EXISTS public.food_app_admins (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL DEFAULT 'admin' CHECK(role='admin'),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.food_app_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_app_admins FROM anon,authenticated;
-- Only seed a confirmed single existing user in this private prelaunch project.
-- Never auto-promote newly registered accounts.
INSERT INTO public.food_app_admins(user_id)
 SELECT id FROM auth.users WHERE (SELECT count(*) FROM auth.users)=1
 ON CONFLICT(user_id) DO NOTHING;
ALTER TABLE public.food_product_submissions ADD COLUMN IF NOT EXISTS photo_path text;
-- Submission owner may not set review/photo fields; private photo path written only by verified backend.
REVOKE UPDATE (photo_path) ON public.food_product_submissions FROM authenticated;
-- Photos are stored in a private storage bucket with per-user pathname checks.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('food-product-labels','food-product-labels',false,5242880,ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'])
 ON CONFLICT (id) DO UPDATE
 SET public=false, file_size_limit=5242880,
     allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'];
DROP POLICY IF EXISTS "food_label_owner_insert" ON storage.objects;
CREATE POLICY "food_label_owner_insert" ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='food-product-labels' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
DROP POLICY IF EXISTS "food_label_owner_read" ON storage.objects;
CREATE POLICY "food_label_owner_read" ON storage.objects FOR SELECT TO authenticated
 USING(bucket_id='food-product-labels' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);
-- Prevent public API invocation of an unrelated privileged event-trigger helper.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC,anon,authenticated;
-- Optimize existing RLS reads without broadening data access.
DROP POLICY IF EXISTS "Authenticated users can manage logs" ON public.diet_logs;
CREATE POLICY "diet_logs_own" ON public.diet_logs FOR ALL TO authenticated
 USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS "Users can manage their own profile" ON public.user_profiles;
CREATE POLICY "user_profiles_own" ON public.user_profiles FOR ALL TO authenticated
 USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
COMMIT;
