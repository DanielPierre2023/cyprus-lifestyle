-- ============================================================================
-- Cyprus Lifestyle — 0009 · Cyprus seed data
--   districts · editorial desks (authors) · rate card · settings · feeds
-- Idempotent (on conflict do nothing / upserts). Safe to re-run.
-- ============================================================================

-- ── Districts (the "county" bucket) ──────────────────────────────────────────
insert into public.county_quotas (county, daily_limit, priority, active) values
  ('nicosia',   4, 1, true),   -- Λευκωσία — capital district
  ('limassol',  4, 1, true),   -- Λεμεσός — business & marina
  ('larnaca',   3, 2, true),   -- Λάρνακα — airport gateway
  ('famagusta', 3, 2, true),   -- Αμμόχωστος — free area / Ayia Napa
  ('paphos',    3, 2, true),   -- Πάφος — heritage coast
  ('kyrenia',   2, 3, true)    -- Κερύνεια
on conflict (county) do nothing;

-- ── Editorial desks as author personas ───────────────────────────────────────
-- editor_key is the routing key the AI desk uses to pick a voice.
insert into public.authors (slug, editor_key, name_en, name_el, name_ro, name_ar,
                            title_en, title_el, title_ro, title_ar,
                            bio_en, avatar_style, specialties, active)
values
 ('cyprus-desk','cyprus',
   'The Cyprus Desk','Το Δελτίο Κύπρου','Redacția Cipru','مكتب قبرص',
   'Cyprus & Politics','Κύπρος & Πολιτική','Cipru & Politică','قبرص والسياسة',
   'The house desk for Cypriot affairs — governance, the economy of the island, and the stories shaping the Republic.',
   'illustrated', array['cyprus','politics','economy'], true),
 ('business-desk','business',
   'The Business Desk','Το Οικονομικό Δελτίο','Redacția Economică','المكتب الاقتصادي',
   'Business & Investment','Οικονομία & Επενδύσεις','Afaceri & Investiții','الأعمال والاستثمار',
   'Markets, funds, shipping, tax residency and the money that moves through Limassol and Nicosia.',
   'illustrated', array['business','investment','property'], true),
 ('property-desk','property',
   'The Property Desk','Το Δελτίο Ακινήτων','Redacția Imobiliare','مكتب العقارات',
   'Property & Architecture','Ακίνητα & Αρχιτεκτονική','Imobiliare & Arhitectură','العقارات والعمارة',
   'Villas, marinas and the new architecture of the coast — the island as an address.',
   'illustrated', array['property','architecture','design'], true),
 ('culture-desk','culture',
   'The Culture Desk','Το Πολιτιστικό Δελτίο','Redacția Culturală','المكتب الثقافي',
   'Culture & Society','Πολιτισμός & Κοινωνία','Cultură & Societate','الثقافة والمجتمع',
   'Art, heritage, music and the social calendar — from ancient Paphos to opening night.',
   'illustrated', array['culture','art','society'], true),
 ('escapes-desk','escapes',
   'The Escapes Desk','Το Δελτίο Ταξιδιών','Redacția Călătorii','مكتب الأسفار',
   'Travel & Escapes','Ταξίδια & Αποδράσεις','Călătorii & Escapade','السفر والوجهات',
   'Where to go and how to arrive — the Mediterranean read through a Cypriot lens.',
   'illustrated', array['travel','hospitality','yachting'], true),
 ('table-desk','table',
   'The Table','Το Τραπέζι','Masa','المائدة',
   'Gastronomy & Wine','Γαστρονομία & Οίνος','Gastronomie & Vin','فن الطهي والنبيذ',
   'Restaurants, vineyards and the Cypriot table — commandaria to the new island kitchen.',
   'illustrated', array['gastronomy','wine','restaurants'], true)
on conflict (slug) do nothing;

-- ── Rate card (EUR) ──────────────────────────────────────────────────────────
insert into public.ad_pricing (slot, label_en, label_el, label_ro, label_ar, format, weekly_eur, monthly_eur, yearly_eur) values
 ('leaderboard-homepage','Homepage Leaderboard','Κεντρικό Banner','Banner Principal','بانر الصفحة الرئيسية','970×250', 900, 3000, 30000),
 ('sidebar-homepage','Homepage Sidebar','Πλαϊνό Banner','Banner Lateral','بانر جانبي','300×600', 600, 2000, 20000),
 ('in-article','In-Article','Εντός Άρθρου','În Articol','داخل المقال','728×90', 450, 1500, 15000),
 ('newsletter-banner','Newsletter Banner','Banner Newsletter','Banner Newsletter','بانر النشرة','600×200', 500, 1800, 18000),
 ('sponsored-article','Sponsored Feature','Χορηγούμενο Άρθρο','Articol Sponsorizat','مقال برعاية','editorial', 1500, 5000, 50000)
on conflict (slot) do update set
  label_en=excluded.label_en, label_el=excluded.label_el, label_ro=excluded.label_ro, label_ar=excluded.label_ar,
  format=excluded.format, weekly_eur=excluded.weekly_eur, monthly_eur=excluded.monthly_eur, yearly_eur=excluded.yearly_eur,
  updated_at=now();

-- ── Automation switchboard (single row) ──────────────────────────────────────
insert into public.automation_settings (id, scraper_enabled, processor_enabled, auto_publish)
values (1, false, false, false)
on conflict (id) do nothing;

-- ── Site settings ────────────────────────────────────────────────────────────
insert into public.site_settings (key, value) values
 ('brand', jsonb_build_object(
    'name','Cyprus Lifestyle',
    'tagline','The island, in full colour',
    'palette', jsonb_build_object('obsidian','#0B0E11','alabaster','#F4EFE6','paper','#F6F1E7',
                                  'ink','#16181C','copper','#B0703A','gold','#C9A24C',
                                  'champagne','#E4D2AC','aegean','#123A4A'))),
 ('locales', jsonb_build_object('list', jsonb_build_array('en','el','ro','ar'),
                                'default','en',
                                'rtl', jsonb_build_array('ar'),
                                'labels', jsonb_build_object('en','English','el','Ελληνικά','ro','Română','ar','العربية'))),
 ('timezone', to_jsonb('Europe/Nicosia'::text)),
 ('currency',  to_jsonb('EUR'::text)),
 ('districts', jsonb_build_array('nicosia','limassol','larnaca','famagusta','paphos','kyrenia')),
 ('categories', jsonb_build_array('cyprus','business','property','culture','escapes','table','world')),
 ('social', jsonb_build_object('instagram','','facebook','','x','','linkedin','','youtube',''))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ── Curated RSS / feed sources ───────────────────────────────────────────────
create unique index if not exists rss_sources_url_key on public.rss_sources(url);

insert into public.rss_sources (name, url, category, source_language, region, tier, is_active) values
-- A · High-end lifestyle & luxury (international, EN)
('Robb Report',                 'https://robbreport.com/feed/',                                  'lifestyle', 'en', 'international', 'luxury', true),
('Architectural Digest',        'https://www.architecturaldigest.com/feed/rss',                  'property',  'en', 'international', 'luxury', true),
('Condé Nast Traveler (US)',    'https://www.cntraveler.com/feed/rss',                           'escapes',   'en', 'international', 'luxury', true),
('Condé Nast Traveller (UK)',   'https://www.cntraveller.com/feed/rss',                          'escapes',   'en', 'international', 'luxury', true),
('Wallpaper*',                  'https://www.wallpaper.com/feed',                                'culture',   'en', 'international', 'luxury', true),
('Vogue',                       'https://www.vogue.com/feed/rss',                                'culture',   'en', 'international', 'luxury', true),
('Harper''s Bazaar',            'https://www.harpersbazaar.com/rss/all.xml/',                    'culture',   'en', 'international', 'luxury', true),
('Tatler',                      'https://www.tatler.com/feed/rss',                               'culture',   'en', 'international', 'luxury', true),
('Town & Country',              'https://www.townandcountrymag.com/rss/all.xml/',                'culture',   'en', 'international', 'luxury', true),
('Elle Decor',                  'https://www.elledecor.com/rss/all.xml/',                        'property',  'en', 'international', 'luxury', true),
('Luxury London',               'https://luxurylondon.co.uk/feed/',                              'lifestyle', 'en', 'international', 'luxury', true),
('The Guardian — Life & Style', 'https://www.theguardian.com/lifeandstyle/rss',                  'lifestyle', 'en', 'international', 'luxury', true),
('The Guardian — Travel',       'https://www.theguardian.com/travel/rss',                        'escapes',   'en', 'international', 'luxury', true),
('The Guardian — Art & Design', 'https://www.theguardian.com/artanddesign/rss',                  'culture',   'en', 'international', 'luxury', true),
('The Guardian — Food',         'https://www.theguardian.com/food/rss',                          'table',     'en', 'international', 'luxury', true),
('NYT — Travel',                'https://rss.nytimes.com/services/xml/rss/nyt/Travel.xml',        'escapes',   'en', 'international', 'luxury', true),
('NYT — Real Estate',           'https://rss.nytimes.com/services/xml/rss/nyt/RealEstate.xml',    'property',  'en', 'international', 'luxury', true),
('NYT — Arts',                  'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml',          'culture',   'en', 'international', 'luxury', true),
-- B · Cyprus (English)
('Cyprus Mail',                 'https://cyprus-mail.com/feed/',                                 'cyprus',    'en', 'cyprus',        'news',    true),
('in-cyprus (Philenews EN)',    'https://in-cyprus.philenews.com/feed/',                         'cyprus',    'en', 'cyprus',        'news',    true),
('Financial Mirror',            'https://www.financialmirror.com/feed/',                         'business',  'en', 'cyprus',        'business',true),
('Cyprus Business News',        'https://cbn.com.cy/feed/',                                      'business',  'en', 'cyprus',        'business',true),
('Cyprus Property News',        'https://www.news.cyprus-property-buyers.com/feed',              'property',  'en', 'cyprus',        'business',true),
-- C · Cyprus (Greek)
('Philenews',                   'https://www.philenews.com/feed/',                               'cyprus',    'el', 'cyprus',        'news',    true),
('Politis',                     'https://politis.com.cy/feed/',                                  'cyprus',    'el', 'cyprus',        'news',    true),
('Sigmalive',                   'https://www.sigmalive.com/rss/news',                            'cyprus',    'el', 'cyprus',        'news',    true),
('Reporter',                    'https://www.reporter.com.cy/feed/',                             'business',  'el', 'cyprus',        'business',true),
('StockWatch',                  'https://www.stockwatch.com.cy/en/rss',                          'business',  'el', 'cyprus',        'business',true),
-- D · Greece (context for the Greek edition)
('eKathimerini (EN)',           'https://www.ekathimerini.com/feed/',                            'world',     'en', 'greece',        'news',    true),
('Kathimerini (GR)',            'https://www.kathimerini.gr/feed/',                              'world',     'el', 'greece',        'news',    true),
('Greece Is',                   'https://www.greece-is.com/feed/',                               'escapes',   'en', 'greece',        'luxury',  true),
-- E · International news / business
('BBC — World',                 'https://feeds.bbci.co.uk/news/world/rss.xml',                   'world',     'en', 'international', 'news',    true),
('BBC — Business',              'https://feeds.bbci.co.uk/news/business/rss.xml',                'business',  'en', 'international', 'business',true),
('The Guardian — World',        'https://www.theguardian.com/world/rss',                         'world',     'en', 'international', 'news',    true),
('NYT — World',                 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',         'world',     'en', 'international', 'news',    true),
('FT — Home',                   'https://www.ft.com/rss/home',                                   'business',  'en', 'international', 'business',true),
-- F · Gulf & MENA (Arabic edition + Gulf audience)
('Al Jazeera (EN)',             'https://www.aljazeera.com/xml/rss/all.xml',                     'world',     'en', 'gulf',          'news',    true),
('Al Arabiya (EN)',             'https://english.alarabiya.net/.mrss/en.xml',                    'world',     'en', 'gulf',          'news',    true),
('Al Arabiya (AR)',             'https://www.alarabiya.net/.mrss/ar.xml',                        'world',     'ar', 'gulf',          'news',    true),
('Arab News (EN)',              'https://www.arabnews.com/rss.xml',                              'world',     'en', 'gulf',          'news',    true),
('Gulf News (EN)',              'https://gulfnews.com/rss',                                      'world',     'en', 'gulf',          'news',    true),
('Asharq Al-Awsat (AR)',        'https://aawsat.com/feed',                                       'world',     'ar', 'gulf',          'news',    true)
on conflict (url) do nothing;
