-- 0094_outreach_templates_v2.sql
-- Refreshed B2B outreach templates in the Cyprus Lifestyle voice (editor-in-chief +
-- private-concierge register). Since the first drafts, the platform is now: an
-- independent seven-language guide to the Republic of Cyprus, a verified directory, an
-- AI concierge that recommends businesses BY NAME to high-intent readers, an events
-- agenda and a membership. The templates now lead with that unique position — curated,
-- verified, merit-based, warm introductions rather than advertising.
--
-- Placeholders the engine fills: {{first_name}} {{business}} {{vertical_label}} {{hook}}
-- {{followup_angle}} {{sender_name}}. The branded wrapper adds the logo, footer and
-- unsubscribe link, so the body stays clean prose. Updates the four cadence steps in
-- place (idempotent); edit further in Admin → Sponsors → Email templates.

-- Step 1 — first contact
update public.crm_templates set
  name    = 'Step 1 · First contact (invitation)',
  subject = $s${{business}} — an invitation to Cyprus Lifestyle$s$,
  body    = $b$<p>Dear {{first_name}},</p>
<p>I'm {{sender_name}}, of <em>Cyprus Lifestyle</em> — the independent, seven-language guide to living well in the Republic of Cyprus, read by the visitors, new residents and investors choosing the island.</p>
<p>We're not a directory. Every name we feature is verified and chosen on merit, and our concierge recommends them — by name, in the reader's own language — to people who are actively asking for a trusted {{vertical_label}}. {{hook}}</p>
<p>{{business}} is precisely the kind of name they ask us for, and I'd like to include you. May I send you how a verified profile works — and, while we curate the first editions, a founding-partner place kept at the founding rate?</p>
<p>A simple "tell me more" is all I need.</p>
<p>Warmly,<br>{{sender_name}}</p>$b$,
  active = true, updated_at = now()
where step = 1;

-- Step 2 — the founding-partner case
update public.crm_templates set
  name    = 'Step 2 · Founding-partner value',
  subject = $s${{business}} — a founding place before we open to all$s$,
  body    = $b$<p>Dear {{first_name}},</p>
<p>Following my note, a little more on why {{business}} fits.</p>
<p>A verified Cyprus Lifestyle profile means three things: a considered, editor-written entry across all seven language editions; your details surfaced by our concierge the moment a reader asks for a {{vertical_label}}; and the quiet credibility of appearing in an independent guide that recommends on merit — never on who paid the most.</p>
<p>While we curate the launch editions I can hold a <strong>founding-partner</strong> place for you: better positioning, kept at the founding rate as we grow. {{followup_angle}}</p>
<p>Shall I send the one-page detail?</p>
<p>Warmly,<br>{{sender_name}}</p>$b$,
  active = true, updated_at = now()
where step = 2;

-- Step 3 — short, warm nudge
update public.crm_templates set
  name    = 'Step 3 · Gentle nudge',
  subject = $s$Re: {{business}} × Cyprus Lifestyle$s$,
  body    = $b$<p>Dear {{first_name}},</p>
<p>A brief follow-up — I know the days are full.</p>
<p>The short version: readers already looking for a {{vertical_label}} in Cyprus are shown {{business}} by name, by our concierge, in their own language. Warm introductions to people with intent — not advertising shouted at strangers.</p>
<p>If it's of interest, reply "yes" and I'll send the details and reserve your founding place. If the timing isn't right, tell me and I won't chase.</p>
<p>Warmly,<br>{{sender_name}}</p>$b$,
  active = true, updated_at = now()
where step = 3;

-- Step 4 — gracious close, door left open
update public.crm_templates set
  name    = 'Step 4 · Gracious close',
  subject = $s$Shall I close the loop, {{first_name}}?$s$,
  body    = $b$<p>Dear {{first_name}},</p>
<p>I don't want to crowd your inbox, so this is my last note for now.</p>
<p>The invitation for {{business}} stays open: a verified, editor-written place in Cyprus Lifestyle, surfaced by our concierge to readers across seven languages who are actively looking for a {{vertical_label}}. When the moment is right, simply reply and I'll pick it straight up — founding terms held wherever I can.</p>
<p>With warm regards from all of us at Cyprus Lifestyle,<br>{{sender_name}}</p>$b$,
  active = true, updated_at = now()
where step = 4;

-- report
select step, left(subject, 60) as subject from public.crm_templates order by step;
