-- =============================================================================
-- CYPRUS LIFESTYLE — Load the 173 Cyprus experience operators into the CRM
-- Apply in the Supabase Dashboard → SQL Editor. Idempotent; safe to re-run.
-- ADDITIVE ONLY: inserts into public.crm_orgs. No existing row is overwritten,
-- no other table is touched, nothing is deleted.
-- =============================================================================
-- WHO THESE ARE
-- The companies that actually run the 566 experiences in public.activities.
-- GetYourGuide does not publish the operator in its structured data — the name
-- sits only in the page's og:brand meta tag, which is where these came from.
-- 173 distinct companies. 100 have an email, 115 a website, 29 a phone.
--
-- WHY THEY ARE NOT IN public.activities
-- 20261004120000_activities.sql deliberately drops `supplier` so no third-party
-- supplier data lives in the catalogue table. The CRM is the right home.
--
-- DEDUPLICATION — two passes, matching how crm_upsert_account() already works:
--   1. by website domain (ignoring free-mail providers), then
--   2. by exact lower(trim(name)).
-- An operator that already exists is SKIPPED, not updated. Expect roughly 29 of
-- the 173 to be skipped — those already match a directory_listings record.
--
-- CONVENTIONS MATCHED TO YOUR EXISTING 17,982 ROWS
--   status   = 'prospect'      (every existing row is 'prospect'; note that
--                               crm_upsert_account() would have written
--                               'contacted', which would have been wrong — we
--                               have not contacted anyone)
--   tier     = 'C'             (17,829 of your rows are C)
--   category = 'tour-activity' (mirrors directory_listings.canonical_category,
--                               and follows your hyphenated-slug convention:
--                               law-relocation, art-culture, car-rental-prestige)
--
-- PROVENANCE IS IN `notes` ON EVERY ROW: how many activities the operator runs,
-- which directory listing it matches, where the email came from, and a warning
-- where the website match was only MEDIUM confidence. Nothing here is invented;
-- a blank field means not found, never guessed.
-- =============================================================================

begin;

create temporary table _ops (
  name             text,
  email            text,
  website          text,
  phone            text,
  district         text,
  notes            text,
  activities       integer,
  directory_name   text,
  website_conf     text
) on commit drop;

insert into _ops (name, email, website, phone, district, notes, activities, directory_name, website_conf) values
('MTS GLOBE CYPRUS LTD.',NULL,'https://mtsglobe.com/cyprus/',NULL,NULL,'GetYourGuide experiences catalogue: runs 43 activities in Cyprus.',43,NULL,'HIGH'),
('Gorgo Travel',NULL,NULL,'+357 26960183','paphos','GetYourGuide experiences catalogue: runs 29 activities in Cyprus. Matches directory listing: Gorgo Travel.',29,'Gorgo Travel',NULL),
('TUI Cyprus Ltd',NULL,'https://www.tuimusement.com/us/cyprus/c_45/',NULL,NULL,'GetYourGuide experiences catalogue: runs 23 activities in Cyprus. Website match is MEDIUM confidence - verify before outreach.',23,NULL,'MED'),
('Sancytours LTD','service@sancytours.com','https://www.sancytours.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 21 activities in Cyprus. Email source: scraped sancytours.com.',21,NULL,'HIGH'),
('EOS TOURS (Cyprus)','info@eos-tour.com','https://eos-tour.com/','+357 99247900','paphos','GetYourGuide experiences catalogue: runs 20 activities in Cyprus. Matches directory listing: EOS TOURS Cyprus Travel Agency. Email source: your database.',20,'EOS TOURS Cyprus Travel Agency','DB'),
('Qualiday',NULL,NULL,'+357 26221203','paphos','GetYourGuide experiences catalogue: runs 11 activities in Cyprus. Matches directory listing: Qualiday.',11,'Qualiday',NULL),
('Latchi Charters','info@latchicharters.com','https://latchicharters.com','+357 96 603 611',NULL,'GetYourGuide experiences catalogue: runs 10 activities in Cyprus. Matches directory listing: Latchi Charters (crm_orgs). Email source: your database.',10,'Latchi Charters (crm_orgs)','DB'),
('Zenobia Divers','info@zenobiadivers.com','https://zenobiadivers.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 10 activities in Cyprus. Email source: scraped zenobiadivers.com.',10,NULL,'HIGH'),
('Paphos Sea Cruises','info@paphosseacruises.com',NULL,'+357 80000011','paphos','GetYourGuide experiences catalogue: runs 10 activities in Cyprus. Matches directory listing: Paphos Sea Cruises. Email source: your database.',10,'Paphos Sea Cruises',NULL),
('Larnaca Napa Sea Cruises','contact@larnacanapacruises.com','https://larnacanapacruises.com/','+357 24656949','larnaca','GetYourGuide experiences catalogue: runs 9 activities in Cyprus. Matches directory listing: Larnaca Napa Sea Cruises. Email source: scraped larnacanapacruises.com.',9,'Larnaca Napa Sea Cruises','DB'),
('Nafsika II','info@cyprusminicruises.com','https://cyprusminicruises.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 8 activities in Cyprus. Email source: scraped cyprusminicruises.com. Website match is MEDIUM confidence - verify before outreach.',8,NULL,'MED'),
('Alasia',NULL,NULL,'+357 24 655868','larnaca','GetYourGuide experiences catalogue: runs 8 activities in Cyprus. Matches directory listing: Alasia.',8,'Alasia',NULL),
('Constructour ltd','info@myconstructour.com','http://myconstructour.com/','+357 96212074','paphos','GetYourGuide experiences catalogue: runs 8 activities in Cyprus. Matches directory listing: ConstrucTOUR. Email source: your database.',8,'ConstrucTOUR','DB'),
('Konstantia Achilleos','info@konstantiaachilleos.com','https://www.konstantiaachilleos.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 7 activities in Cyprus. Email source: scraped konstantiaachilleos.com.',7,NULL,'HIGH'),
('CreativeTours Ltd','groups@creative.com.cy','https://www.creative.com.cy/en/',NULL,NULL,'GetYourGuide experiences catalogue: runs 7 activities in Cyprus. Email source: scraped creative.com.cy. Website match is MEDIUM confidence - verify before outreach.',7,NULL,'MED'),
('Gastronomy Cyprus Tours & Events','info@gastronomycyprus.com','https://www.gastronomycyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 7 activities in Cyprus. Email source: scraped gastronomycyprus.com.',7,NULL,'HIGH'),
('GXG Xplore Cy Tours Ltd (Explore Cyprus)','info@explore-cyprus.com','https://explore-cyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 7 activities in Cyprus. Email source: scraped explore-cyprus.com.',7,NULL,'HIGH'),
('INTERYACHTING','info@interyachting.com.cy','https://www.interyachting.com.cy','+357 25 080350','limassol','GetYourGuide experiences catalogue: runs 7 activities in Cyprus. Matches directory listing: InterYachting. Email source: your database.',7,'InterYachting','DB'),
('F.P.P ADVENTURES CY RENTALS & TOURS LTD','info@adventurescyprus.com','https://www.adventurescyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 7 activities in Cyprus. Email source: scraped adventurescyprus.com.',7,NULL,'HIGH'),
('SnapCyprus',NULL,'https://snapcyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 7 activities in Cyprus.',7,NULL,'HIGH'),
('Cyprus Walks Etc','phivos@cypruswalksetc.com','https://www.cypruswalksetc.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 6 activities in Cyprus. Email source: scraped cypruswalksetc.com.',6,NULL,'HIGH'),
('Ascot Travel & Tours','info@ascotcyprus.com','https://ascotcyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 6 activities in Cyprus. Email source: scraped ascotcyprus.com.',6,NULL,'HIGH'),
('M&M LUX SIGHTSEEING LTD','info@mmluxsightseeing.com','https://mmluxsightseeing.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 6 activities in Cyprus. Email source: scraped mmluxsightseeing.com.',6,NULL,'HIGH'),
('Project Cyprus Tours','info@project-cyprustours.com','https://project-cyprustours.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Email source: scraped project-cyprustours.com.',5,NULL,'HIGH'),
('CYCRUISES','info@cycruises.com','https://cycruises.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Email source: scraped cycruises.com.',5,NULL,'HIGH'),
('Trackers Excursions',NULL,'https://trackersexcursions.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus.',5,NULL,'HIGH'),
('Sea Island Travel and Tours Ltd',NULL,NULL,'+357 25583728','limassol','GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Matches directory listing: Sea Island Travel and Tours Ltd.',5,'Sea Island Travel and Tours Ltd',NULL),
('MP Westcoast Cruises Ltd',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus.',5,NULL,NULL),
('Telis Wild And Free Jeep Safari And Mini Bus Tours',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus.',5,NULL,NULL),
('Green Bay Watersports & Wake Academy','wake@greenbaywatersports.com',NULL,'+357 96161010','famagusta','GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Matches directory listing: Green Bay Watersports & Wake Academy. Email source: your database.',5,'Green Bay Watersports & Wake Academy',NULL),
('St Georgios Boat','reservations@stgeorgiosboat.com','https://www.stgeorgiosboat.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Email source: scraped stgeorgiosboat.com.',5,NULL,'HIGH'),
('Sea World Diving Adventures Cyprus',NULL,NULL,'+357 96053569','limassol','GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Matches directory listing: Seaworld Diving Adventures Cyprus.',5,'Seaworld Diving Adventures Cyprus',NULL),
('Silent Blue - Dive Escapes','info@silentbluecyprus.com','https://www.silentbluecyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Email source: scraped silentbluecyprus.com.',5,NULL,'HIGH'),
('Taba Diving Centre',NULL,'https://tabadiving.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus.',5,NULL,'HIGH'),
('Demetris chara bbq boat latchi','demetrischarabbqboat@gmail.com','https://demetris-chara-bbq-boat.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 5 activities in Cyprus. Email source: scraped demetris-chara-bbq-boat.com.',5,NULL,'HIGH'),
('Latchi Pleasure Boats Boat Hire','info@latchipleasureboats.com','https://latchipleasureboats.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Email source: scraped latchipleasureboats.com.',4,NULL,'HIGH'),
('Ocean view diving Cyprus','info@oceanviewdive.com','https://www.oceanviewdive.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Email source: scraped oceanviewdive.com.',4,NULL,'HIGH'),
('Cyprus Taste Tours','yum@cyprustastetours.com','https://cyprustastetours.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Email source: scraped cyprustastetours.com.',4,NULL,'HIGH'),
('Nataly Tours',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus.',4,NULL,NULL),
('Sunny Escapes Cyprus',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus.',4,NULL,NULL),
('Sunmoon Hospitality','sunmooncy2020@gmail.com','https://www.sunmooncy.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Email source: scraped sunmooncy.com.',4,NULL,'HIGH'),
('TT Motorcycle Rentals & Tours',NULL,'https://paphosmotorcyclerentals.com.cy/',NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus.',4,NULL,'HIGH'),
('STS MOTOFUN LTD','info@cyprus-quads.com','https://stsmotofun.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Email source: scraped stsmotofun.com.',4,NULL,'HIGH'),
('Wave Dancer Cruises & Events','wavedanceshipping@gmail.com','http://www.wavedancercyprus.com/','+357 96776068','paphos','GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Matches directory listing: Wave Dancer Cruises & Events. Email source: scraped wavedancercyprus.com.',4,'Wave Dancer Cruises & Events','DB'),
('Cyprus Wine Tours','info@cypruswinetour.com','https://cypruswinetour.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Email source: scraped cypruswinetour.com. Website match is MEDIUM confidence - verify before outreach.',4,NULL,'MED'),
('Yellow Semi-Submarine Larnaca','zorkylarnaca@gmail.com','http://www.yellowsemisubmarinelarnaca.com/','+357 99634215','larnaca','GetYourGuide experiences catalogue: runs 4 activities in Cyprus. Matches directory listing: YELLOW SEMI SUBMARINE LARNACA. Email source: your database.',4,'YELLOW SEMI SUBMARINE LARNACA','DB'),
('Puppy Yoga Retreat',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus.',3,NULL,NULL),
('Antonakis Gregoriou Boat trips',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus.',3,NULL,NULL),
('Guydeez','info@guydeez.com','https://guydeez.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped guydeez.com. Website match is MEDIUM confidence - verify before outreach.',3,NULL,'MED'),
('VCyprusFish LTD','vcyprusfish@gmail.com','https://www.vodolazcyprusfishing.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped vodolazcyprusfishing.com.',3,NULL,'HIGH'),
('Paphos Boat Tours','paphosboattours@hotmail.com','https://paphosboattours.com/','+357 97 683680','paphos','GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Matches directory listing: Paphos Boat Tours. Email source: your database.',3,'Paphos Boat Tours','DB'),
('Golden Ride Rentals and Safari','contact@goldenriderentals.cy','https://www.goldenriderentals.net/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped goldenriderentals.net.',3,NULL,'HIGH'),
('T.H.E. AQUANAUT DIVE CENTER LTD','aquanautdivers@gmail.com','https://www.scubadivecyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped scubadivecyprus.com. Website match is MEDIUM confidence - verify before outreach.',3,NULL,'MED'),
('Cyprus Vip Service','info@cyprusvipservice.com','https://www.cyprusvipservice.com/','+357 99200011','larnaca','GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Matches directory listing: Cyprus VIP Service. Email source: your database.',3,'Cyprus VIP Service','DB'),
('Aeria Travel & Tours','aeriatravel@cytanet.com.cy','https://aeriatravel.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped aeriatravel.com.',3,NULL,'HIGH'),
('Chris Andreou Quad Buggy Safari Tours','chrisandreourentals@gmail.com','https://chrisandreourentals.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped chrisandreourentals.com.',3,NULL,'HIGH'),
('LYDIA YACHTS','info@lydiayachts.com','https://lydiayachts.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped lydiayachts.com.',3,NULL,'HIGH'),
('Paphos Sea Lines','bookings@paphossealines.com','https://paphossealines.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped paphossealines.com.',3,NULL,'HIGH'),
('AYIA TRIAS CRUISES','ayiatriascruises@gmail.com','https://www.protarasboattrip.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped protarasboattrip.com.',3,NULL,'HIGH'),
('Stevie''s Jeep Safaris','info@steviespaphostaxis.com','https://steviespaphostaxis.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped steviespaphostaxis.com.',3,NULL,'HIGH'),
('LCH BLUWAVE EXPERIENCE LTD',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus.',3,NULL,NULL),
('Hilde Jeep Safari Ltd',NULL,'https://paphosjeepsafari.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus.',3,NULL,'HIGH'),
('EVIS JEEP SAFARI ADVENTURES LTD','info@evisjeepsafari.com','https://evisjeepsafari.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped evisjeepsafari.com.',3,NULL,'HIGH'),
('Cyprus Fun Travel Ltd.','info@cyprusfuntravel.com','https://cyprusfuntravel.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped cyprusfuntravel.com.',3,NULL,'HIGH'),
('Welcome Pickups','support@welcomepickups.com','https://www.welcomepickups.com/cyprus/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped welcomepickups.com.',3,NULL,'HIGH'),
('A.Y Yellow Boat Cruises ltd','theyellowboatprotarascruises@gmail.com','https://theyellowboatprotarascruises.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 3 activities in Cyprus. Email source: scraped theyellowboatprotarascruises.com. Website match is MEDIUM confidence - verify before outreach.',3,NULL,'MED'),
('SOK Rentals Quad & Buggy Safari Tours',NULL,'https://www.facebook.com/p/SOK-Rentals-100048614181234/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Website match is MEDIUM confidence - verify before outreach.',2,NULL,'MED'),
('Crina Barbu Photography','contact@photographercyprus.com','https://photographercyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped photographercyprus.com.',2,NULL,'HIGH'),
('Panormitis sailing yacht',NULL,'https://www.facebook.com/p/PANORMITIS-SAILING-YACHT-100066864346289/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Website match is MEDIUM confidence - verify before outreach.',2,NULL,'MED'),
('MA The Super Team Jeep Safari LTD',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('Stelios jeep safari',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('Undersea Adventures in Cyprus',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('Bdoir',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('Rec2Tech Scuba','dive@rec2techscuba.com','https://www.rec2techscuba.com/','+357 96039632','limassol','GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Matches directory listing: REC2TECH SCUBA - World Class Scuba Diving Centre Cyprus. Email source: your database.',2,'REC2TECH SCUBA - World Class Scuba Diving Centre Cyprus','DB'),
('Kapparis Waterfun','chris@kappariswaterfun.com','https://kappariswaterfun.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped kappariswaterfun.com.',2,NULL,'HIGH'),
('Venus Sea Cruises','info@venusseacruises.com','https://venusseacruises.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped venusseacruises.com.',2,NULL,'HIGH'),
('Mr John Ghost Town Famagusta Tours','info@ghosttownfamagustabymrjohn.com','https://ghosttownfamagustabymrjohn.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped ghosttownfamagustabymrjohn.com.',2,NULL,'HIGH'),
('Crystal Sea Latchi',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('JC TAXI CY',NULL,'https://jctaxi-cy.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,'HIGH'),
('ESCAPE TOURS CYPRUS','info@escapetourscy.com','https://www.escapetourscyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped escapetourscyprus.com. Website match is MEDIUM confidence - verify before outreach.',2,NULL,'MED'),
('Pyrgos Boutique Winery','pyrgoswinery@gmail.com','https://pyrgoswinery.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped pyrgoswinery.com. Website match is MEDIUM confidence - verify before outreach.',2,NULL,'MED'),
('Paraskevas Ch. Paraskeva Travel & Tours','info@aphroditecruisesprotaras.com','https://aphroditecruisesprotaras.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped aphroditecruisesprotaras.com.',2,NULL,'HIGH'),
('Safari Dimitris',NULL,'https://safaridimitris.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,'HIGH'),
('Seaadventureactivities','seaadventureactivities@gmail.com','https://www.seaadventureactivities.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped seaadventureactivities.com.',2,NULL,'HIGH'),
('Cyprus Paragliding',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('Great Turtle Diving Center',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('VIP Wine tasting',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus.',2,NULL,NULL),
('Blue Star Cruise','info@bluestarcruise.com','https://bluestarcruise.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped bluestarcruise.com.',2,NULL,'HIGH'),
('Camel Park','info@camel-park.com','https://www.camel-park.com/','+357 99447751','larnaca','GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Matches directory listing: Camel Park Mazotos. Email source: your database.',2,'Camel Park Mazotos','DB'),
('Lokafy','info@lokafy.com','https://lokafy.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Email source: scraped lokafy.com. Website match is MEDIUM confidence - verify before outreach.',2,NULL,'MED'),
('Andreas Ioannou',NULL,NULL,'+357 24625403','larnaca','GetYourGuide experiences catalogue: runs 2 activities in Cyprus. Matches directory listing: Ioannou Andreas.',2,'Ioannou Andreas',NULL),
('Ride Nicosia',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Adventure Quad Safari Ayia Napa',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('PAPHOS NATURE','info@paphosnature.com','https://www.paphosnature.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped paphosnature.com.',1,NULL,'HIGH'),
('Blue Lagoon I & II',NULL,'https://www.facebook.com/bluelagoon1and2/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Captain Costas Private Charters',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Exyde',NULL,'https://www.goexyde.com/en',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Hiking Cyprus',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Pastry Chef Eleni',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Lockdown Paphos','nervecentre@lockdownpaphos.com','https://lockdownpaphos.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped lockdownpaphos.com.',1,NULL,'HIGH'),
('Latchi Sailing Charters','info@latchicharters.com','https://latchicharters.com','+357 96 603 611',NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Latchi Charters (crm_orgs). Email source: your database.',1,'Latchi Charters (crm_orgs)','DB'),
('M&C POSEIDON MARITIME LTD',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Poseidon Dive Centre','info@poseidoncyprus.com','https://www.poseidoncyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped poseidoncyprus.com.',1,NULL,'HIGH'),
('MPM THOMA PHOTOGRAPHY LTD',NULL,NULL,'+357 26932889','paphos','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: MPM Thoma Photography Ltd.',1,'MPM Thoma Photography Ltd',NULL),
('Cyherbia Botanical Park','info@cyherbia.com','https://www.cyherbia.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped cyherbia.com.',1,NULL,'HIGH'),
('Diamonds Showbar','diamonds.showbar@gmail.com','https://diamondsshowbar.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped diamondsshowbar.com.',1,NULL,'HIGH'),
('Travmonde OÜ','contact@travmonde.com','https://travmonde.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped travmonde.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Yellow Glass Bottom Boat','duodynamicsltd@gmail.com','https://paphos-glass-bottom-boat-trips.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped paphos-glass-bottom-boat-trips.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Foodapest',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Cyprus Photography Tours',NULL,'https://www.cyprusphotographytours.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Discovery Cruises Cyprus','adriandemetriou@gmail.com','https://www.discoverycruisescyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped discoverycruisescyprus.com.',1,NULL,'HIGH'),
('Dolphin Submarine - Glass bottom boat','info@dolphinsubmarinecruises.com','https://dolphinsubmarinecruises.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped dolphinsubmarinecruises.com.',1,NULL,'HIGH'),
('Canvas & Cocktails Cyprus',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('IoannisLWT',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('P.Karrotsakis Cruises LTD',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Cornelia Luxury cruiser','cyprusluxurycruiser@hotmail.com','https://corneliacruiser.com/en/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped corneliacruiser.com.',1,NULL,'HIGH'),
('Explore Hidden Cyprus','info@explore.cy','https://www.explore.cy/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped explore.cy.',1,NULL,'HIGH'),
('De-Vine Tours -- Cyprus''s Exclusive Wine Tour',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Paradox Museum Limassol','limassolgm@paradoxmuseum.com','https://www.paradoxmuseumlimassol.com/','+357 25051758','limassol','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Paradox Museum Limassol. Email source: scraped paradoxmuseumlimassol.com.',1,'Paradox Museum Limassol','DB'),
('Agrossafari','quadsafariagros@gmail.com','https://agrossafari.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped agrossafari.com.',1,NULL,'HIGH'),
('Dive Cypria','info@divecypria.cy','https://divecypria.cy/','+357 97 754194','famagusta','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Dive Cypria. Email source: your database.',1,'Dive Cypria','DB'),
('Natalena Hapeshie',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('George''s Boat Hire','info@georgesboathire.com','https://www.georgesboathire.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped georgesboathire.com.',1,NULL,'HIGH'),
('Aphrodites Tours','info@aphroditestours.com','https://aphroditestours.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped aphroditestours.com.',1,NULL,'HIGH'),
('PaphosAphroditeWaterpark','info@aphroditewaterpark.com','https://www.aphroditewaterpark.com/','+357 26913638','paphos','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Paphos Aphrodite Waterpark. Email source: scraped aphroditewaterpark.com.',1,'Paphos Aphrodite Waterpark','DB'),
('SAIL & FLY LTD',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Paphos Sea & Space Adventures',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Opatrip.comU.S.','travel@opatrip.com','https://opatrip.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped opatrip.com.',1,NULL,'HIGH'),
('Pictrip',NULL,'https://pictrip.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Sunshine Safari Tours','info@sunshinesafaritours.com','https://sunshinesafaritours.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped sunshinesafaritours.com.',1,NULL,'HIGH'),
('Mahimos Boat Hire','info@mahimosboathire.com','https://mahimosboathire.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped mahimosboathire.com.',1,NULL,'HIGH'),
('ATE Mateusz Kucza',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Love events Cyprus',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('TRANSIGO TRAVEL S.R.L.','info@transigotrips.com','https://transigotrips.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped transigotrips.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('My Me Pool Bar',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Let''s go fishing',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Adjaratours',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Michael Fournaris Trading as Trysegway','info@trysegway.com','https://www.trysegway.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped trysegway.com.',1,NULL,'HIGH'),
('Sergio',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('GIPD MEDUSA BOAT TRIPS LTD','info@medusacruises.com','https://protarasmedusaboattrips.com/','+357 99979977','famagusta','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Medusa Cruises | Boat Trips Protaras & Ayia Napa. Email source: scraped protarasmedusaboattrips.com.',1,'Medusa Cruises | Boat Trips Protaras & Ayia Napa','DB'),
('Imedna','info@cyprusyachtcharters.com','https://cyprusyachtcharters.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped cyprusyachtcharters.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('LocalBini AG (EU)',NULL,'https://www.localbini-ag.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Cyprus Troodos Tours (Geopark)',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Walk Talk Cyprus','eleni@walktalk.coach','https://www.walktalkcyprus.com/','+357 99444531','nicosia','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Walk Talk Cyprus. Email source: your database.',1,'Walk Talk Cyprus','DB'),
('Zen Collective Management',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('BLACK PEARL CRUISES LTD','info@cycruises.com','https://cycruises.com/product/black-pearl/','+357 99574148','famagusta','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: The Black Pearl Boat. Email source: scraped cycruises.com.',1,'The Black Pearl Boat','DB'),
('Cydive','info@cydive.com','https://www.cydive.com/','+357 26 934271','paphos','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Cydive Diving Centre. Email source: scraped cydive.com.',1,'Cydive Diving Centre','DB'),
('PPN Neugebauer Consulting eGbR',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Alkion glass bottom boat',NULL,'https://www.facebook.com/alkionbluelagooncruises/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('COOKING WITH COKONES','cokones.cyprus@gmail.com','https://cokones.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped cokones.com.',1,NULL,'HIGH'),
('Lea Wellness Events Center','office.lea.womencenter@gmail.com','https://www.leawomencenter.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped leawomencenter.com.',1,NULL,'HIGH'),
('A.M LUXURY CRUISES & WATER SPORTS',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('GEORGINA motor yacht','georginamotoryacht@gmail.com','https://georginayachting.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped georginayachting.com.',1,NULL,'HIGH'),
('Summerline Cruises','info@aphrodite2cruises.com','https://www.aphrodite2cruises.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped aphrodite2cruises.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Hip Photography',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('JL Podvodnyi Mir ltd','madfish@podvodnyimir.com','http://www.en.podvodnyimir.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped en.podvodnyimir.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Atlantis Turtle Watching Cruise & Snorkelling Adventure','atlantisturtlewatching@gmail.com','https://turtlewatchingcruise.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped turtlewatchingcruise.com.',1,NULL,'HIGH'),
('Ocean Queen','booking@ocean-queen.net','https://ocean-queen.net/','+357 97 692212','famagusta','GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Matches directory listing: Ocean Queen. Email source: your database.',1,'Ocean Queen','DB'),
('Yachting Icon','info@yachtingicon.cy','https://yachtingicon.cy/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped yachtingicon.cy.',1,NULL,'HIGH'),
('Roxana Diaconu Photography',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('efoilriderscy',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Salonica View','info@salonicaview.com','https://www.salonicaview.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped salonicaview.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Baywatch Watersports',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Tefkros Tours Protaras','tasos.sardalos@cytanet.com.cy','https://tefkros-tours.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped tefkros-tours.com.',1,NULL,'HIGH'),
('Seletta Lab',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Recharged rentals and tours','info@rechargedebikerentals.com.cy','https://www.rechargedebikerentals.com.cy/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped rechargedebikerentals.com.cy. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED'),
('Paphos Segway Tour','paphossegwaytour@gmail.com','https://www.paphossegwaytour.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped paphossegwaytour.com.',1,NULL,'HIGH'),
('AroundTour',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Nicosia Bike Tours',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Captain Morgan Blue Lagoon and Turtle Cruise (Ayia Napa)',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('P.I.T',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('DSRaider Cyprus Tours',NULL,NULL,NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus.',1,NULL,NULL),
('Clay Shooting Experience Cyprus','pullandfire@gmail.com','https://www.clayshootingexperiencecyprus.com/',NULL,NULL,'GetYourGuide experiences catalogue: runs 1 activity in Cyprus. Email source: scraped clayshootingexperiencecyprus.com. Website match is MEDIUM confidence - verify before outreach.',1,NULL,'MED');

-- Normalise the website domain once, for the domain-level dedupe below.
create temporary table _ops_d on commit drop as
select o.*,
       nullif(lower(regexp_replace(regexp_replace(coalesce(o.website,''), '^https?://(www\.)?', ''), '/.*$', '')), '') as domain,
       case
         when lower(split_part(coalesce(o.email,''), '@', 2)) in
              ('gmail.com','googlemail.com','yahoo.com','hotmail.com','outlook.com',
               'icloud.com','proton.me','protonmail.com','cytanet.com.cy')
           then null
         else nullif(lower(split_part(coalesce(o.email,''), '@', 2)), '')
       end as email_domain
from _ops o;

-- Insert only the operators that do not already exist.
insert into public.crm_orgs (name, category, tier, district, website, email, phone, status, notes, source_url, outreach_locale)
select o.name,
       'tour-activity',
       'C',
       o.district,
       o.website,
       o.email,
       o.phone,
       'prospect',
       o.notes,
       'https://www.getyourguide.com/cyprus-l169006/',
       'en'
from _ops_d o
where not exists (
        select 1 from public.crm_orgs c
         where lower(btrim(c.name)) = lower(btrim(o.name)))
  and not exists (
        select 1 from public.crm_orgs c
         where o.domain is not null
           and c.website is not null
           and lower(c.website) like '%' || o.domain || '%')
  and not exists (
        select 1 from public.crm_orgs c
         where o.email_domain is not null
           and c.email is not null
           and lower(c.email) like '%' || o.email_domain || '%');

-- Link each new org to its directory listing where we confirmed a match, so the
-- CRM and the directory stay joined (crm_orgs.directory_listing_id).
update public.crm_orgs c
   set directory_listing_id = d.id
  from _ops_d o
  join public.directory_listings d
    on lower(btrim(d.name_en)) = lower(btrim(o.directory_name))
 where c.category = 'tour-activity'
   and lower(btrim(c.name)) = lower(btrim(o.name))
   and o.directory_name is not null
   and c.directory_listing_id is null;

commit;

-- =============================================================================
-- Verification (writes nothing).
-- Expected on a first run: inserted ≈ 144, skipped_as_duplicate ≈ 29,
-- total 173. On a re-run: inserted stays the same, nothing is added.
-- =============================================================================
select
  (select count(*) from public.crm_orgs where category = 'tour-activity')                      as operators_in_crm,
  (select count(*) from public.crm_orgs where category = 'tour-activity'
     and nullif(btrim(email), '') is not null)                                                 as with_email,
  (select count(*) from public.crm_orgs where category = 'tour-activity'
     and nullif(btrim(website), '') is not null)                                               as with_website,
  (select count(*) from public.crm_orgs where category = 'tour-activity'
     and nullif(btrim(phone), '') is not null)                                                 as with_phone,
  (select count(*) from public.crm_orgs where category = 'tour-activity'
     and directory_listing_id is not null)                                                     as linked_to_directory,
  (select count(*) from public.crm_orgs where category = 'tour-activity'
     and status <> 'prospect')                                                                  as wrong_status_must_be_0,
  (select count(*) from (select lower(btrim(name)) n from public.crm_orgs
     group by 1 having count(*) > 1) z)                                                         as duplicate_names_in_crm;
