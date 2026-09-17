-- ============================================================================
-- Cyprus Lifestyle — 0037 · Commercial launch: Founding-100 pricing
--   Repositions the whole rate card for market entry in Cyprus:
--     • list_price  = the rack (full) price, shown struck-through as an anchor
--     • price_from  = the FOUNDING launch price (what is actually charged)
--     • price_to    = null everywhere (single, clean, self-serve prices)
--   Also fills every line with persuasive site copy (blurb_en), opens the
--   à-la-carte placements to self-serve checkout, and refreshes the outreach
--   email cadence to lead with the founding offer.
--
--   Nothing here is destructive; fully idempotent — safe to run once or again.
--   Prices are ex-VAT (standard Cyprus B2B). Founding rates are a launch
--   promotion: the rack price stays visible so the discount reads as a deal.
-- ============================================================================

-- ── 1. anchor column ────────────────────────────────────────────────────────
alter table public.ad_pricing
  add column if not exists list_price numeric;   -- rack price, for the struck-through anchor

-- ── 2. reprice + copy, line by line ─────────────────────────────────────────
-- Pattern per row: list_price = rack anchor, price_from = founding price,
-- price_to = null (single price), self_serve where we want instant checkout.

-- Packages ────────────────────────────────────────────────────────────────
update public.ad_pricing set
  list_price = 490, price_from = 149, price_to = null, unit = 'per year', self_serve = true,
  blurb_en = 'Your verified profile in the directory our readers actually search — full photography, top-of-category placement, a map pin and direct contact links, across all seven editions. The simplest way to be found by people who are already looking.'
where slot = 'tier-listed';

update public.ad_pricing set
  list_price = 199, price_from = 49, price_to = null, unit = 'per month', self_serve = true,
  blurb_en = 'Everything in Listed, plus a rotating display placement, one sponsored feature each quarter and a newsletter mention — the complete weekly presence for the hotels, developers, clinics and firms who want to be seen, not just found.'
where slot = 'tier-featured';

update public.ad_pricing set
  list_price = 6000, price_from = 3000, price_to = null, unit = 'per year', self_serve = false,
  blurb_en = 'Own your category. Exclusive placement so no competitor appears beside you, a named editorial series, section sponsorship and priority everywhere your customers look. A handful only, by invitation.'
where slot = 'tier-partner';

-- À la carte ─────────────────────────────────────────────────────────────
update public.ad_pricing set
  list_price = 300, price_from = 79, price_to = null, unit = 'per month', self_serve = true,
  blurb_en = 'Your banner on the homepage and the article pages your customers actually read — in every language they read them.'
where slot = 'sidebar-leaderboard';

update public.ad_pricing set
  list_price = 490, price_from = 149, price_to = null, unit = 'per month', self_serve = true,
  blurb_en = 'Present an entire section — The Table, Property, Escapes — with a "presented by" lockup and your banner on every article inside it.'
where slot = 'section-sponsorship';

update public.ad_pricing set
  list_price = 490, price_from = 149, price_to = null, unit = 'per feature', self_serve = true,
  blurb_en = 'A branded article written by our editors, published in all seven languages and promoted across the site and the newsletter — your story, told properly.'
where slot = 'sponsored-feature';

update public.ad_pricing set
  list_price = 250, price_from = 79, price_to = null, unit = 'per send', self_serve = true,
  blurb_en = 'Be the sole sponsor of the Saturday Letter — one uncluttered message to our most engaged readers, in their own language.'
where slot = 'newsletter-sole';

update public.ad_pricing set
  list_price = 150, price_from = 39, price_to = null, unit = 'per month', self_serve = true,
  blurb_en = 'Be the only advertiser shown in your category — a quiet monopoly on attention exactly where buyers are deciding.'
where slot = 'directory-exclusive';

update public.ad_pricing set
  list_price = 90, price_from = 19, price_to = null, unit = 'per event', self_serve = true,
  blurb_en = 'Put your event in front of the island — a featured spotlight in the Agenda plus a push across our social channels.'
where slot = 'agenda-event';

update public.ad_pricing set
  list_price = 490, price_from = 149, price_to = null, unit = 'per year', self_serve = true,
  blurb_en = 'The enhanced directory profile — verified badge, photography and top-of-category placement, across all seven editions.'
where slot = 'premium-listing';

-- ── 3. safety net: anything else priced stays consistent (no stray ranges) ──
update public.ad_pricing set price_to = null where price_to is not null;
-- Everything except the invitation-only Partner tier is self-serve.
update public.ad_pricing set self_serve = true  where slot <> 'tier-partner' and price_from is not null;
update public.ad_pricing set self_serve = false where slot  = 'tier-partner';

-- ── 4. refresh the outreach cadence to lead with the founding offer ─────────
-- Re-seed the four cadence steps (idempotent by step). Body is inner HTML
-- wrapped by brandedEmail() at send time. Merge fields: {{first_name}},
-- {{business}}, {{vertical_label}}, {{hook}}, {{followup_angle}}, {{sender_name}}.
insert into public.crm_templates (step, name, subject, body) values
 (1, 'Feature invitation',
     '{{business}} — a feature in Cyprus Lifestyle?',
     '<p>Dear {{first_name}},</p><p>I''m writing from <em>Cyprus Lifestyle</em>, the island''s multilingual magazine — read in seven languages by the residents, relocators and high-spending visitors who make up a quarter of everyone now living in Cyprus, and who decide where to eat, stay, buy and spend their time here.</p><p>{{hook}}</p><p>We''d like to feature {{business}} — a short profile or interview, at no cost to you. It''s simply the kind of place our readers should know about.</p><p>Would you be open to a brief conversation this week or next? I can send a few questions by email, or call whenever suits.</p><p>Warm regards,<br>{{sender_name}}<br>Editorial &amp; Partnerships · Cyprus Lifestyle</p>'),
 (2, 'Founding partner invitation',
     '{{business}} — a founding partner place (before we open to all)',
     '<p>Dear {{first_name}},</p><p>Following my note about featuring {{business}}, I wanted to reach you before we open partnerships publicly.</p><p>We''re inviting the first <strong>100 businesses</strong> in Cyprus to join as <strong>founding partners</strong> — a verified listing across all seven editions, a banner on the pages your customers read, and a place in our newsletter. Founding partners lock a launch rate that is a fraction of our published price, and <strong>keep it for as long as they stay</strong>, even after prices rise.</p><p>For {{business}} the founding <em>Featured</em> place is <strong>€49/month</strong> (published rate €199), and a verified <em>Listed</em> profile is <strong>€149 for the year</strong>. {{business}} would sit naturally in our {{vertical_label}} category.</p><p>The founding places are genuinely limited. May I hold one for you, or send the one-page media kit first?</p><p>Warm regards,<br>{{sender_name}}<br>Cyprus Lifestyle</p>'),
 (3, 'Follow-up',
     'Re: {{business}} × Cyprus Lifestyle — founding place',
     '<p>Dear {{first_name}},</p><p>I know how full the days get, so just a short follow-up. {{followup_angle}}</p><p>The founding-partner rate is still open for {{business}}, but the 100 places are filling. If it''s easier, I can simply reserve your place now and send everything to confirm — no commitment until you''re happy.</p><p>Either way, thank you for your time.</p><p>{{sender_name}}<br>Cyprus Lifestyle</p>'),
 (4, 'Graceful close',
     'Shall I close the loop, {{first_name}}?',
     '<p>Dear {{first_name}},</p><p>I don''t want to crowd your inbox, so this is my last note for now. If a founding place for {{business}} is something for later, just reply and I''ll pick it up then — though I can''t promise the founding rate will still be open.</p><p>Wishing you and the team a great season.</p><p>{{sender_name}}<br>Cyprus Lifestyle</p>')
on conflict (step) do update
  set name = excluded.name, subject = excluded.subject, body = excluded.body, updated_at = now();

-- ── report ──────────────────────────────────────────────────────────────────
select slot, label_en, list_price as rack, price_from as founding, unit, self_serve
from public.ad_pricing
where price_from is not null
order by kind desc, sort;
