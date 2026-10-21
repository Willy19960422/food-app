-- Allow users to correct their own pending submissions, but NEVER to set status or review fields.
grant update (brand,name,category,sub_category,basis_type,serving_quantity,serving_unit,
  kcal,protein,fat,carbs,source_type,source_url)
on public.food_product_submissions to authenticated;
create policy "food_submissions_update_own_pending"
on public.food_product_submissions for update to authenticated
using (user_id=(select auth.uid()) and status='pending')
with check (user_id=(select auth.uid()) and status='pending'
  and review_notes is null and reviewed_at is null);
