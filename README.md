# Cyprus Lifestyle — Discovery Engine, Phase 0 + Phase 1

Three destinations (as always):

1) EDGE FUNCTION — paste over your `enrich-directory` function and deploy:
   supabase/functions/enrich-directory/index.ts
   (now: Google-Places photo first + editorial DESCRIPTION + RATING in one pass)

2) SQL — supabase/migrations/0043_directory_richness.sql
   ALREADY APPLIED to your database by me (adds rating/rating_count + indexes).
   Kept here so it's in git history — safe to run again (idempotent).

3) APP CODE — commit these → Vercel:
   lib/queries.ts          (rating fields + getNearby / getPeers / getEventsByDistrict)
   lib/seo.ts              (aggregateRating rich-result on listings)
   components/CoverImage.tsx        (branded placeholder; retires random stock)
   app/[locale]/(site)/directory/page.tsx            (brand fallback on cards)
   app/[locale]/(site)/directory/[type]/page.tsx     (brand fallback on cards)
   app/[locale]/(site)/directory/[type]/[slug]/page.tsx   (THE LISTING HUB — new)

After you paste the function and commit the code, reply "in" and I resume the
drain — one pass fixes the logo photos AND fills descriptions + ratings for all
2,934 listings. The hub page ("Around this place" + comparison + what's on nearby)
goes live with the Vercel deploy.
