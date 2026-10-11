-- directory_summaries_20261007.sql — summaries of the 8 non-public listings that have an English summary but no translation
-- Idempotent DATA script (not a migration, no schema change). Run it by hand in the Supabase SQL editor.
-- Every column is written ONLY when it is empty or still a verbatim copy of the English text, so a human
-- translation is never overwritten and re-running the script changes nothing the second time.
-- All non-English text was written in-session (no translation API) and NEEDS NATIVE REVIEW.
-- Generated 8 UPDATE statements; each should report 'UPDATE 1'.
begin;
update public.directory_listings set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Το Circle Pearl Residences είναι μια μπουτίκ οικιστική ανάπτυξη που έρχεται σύντομα στην Περνέρα.' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Circle Pearl Residences este un ansamblu rezidențial boutique care urmează să apară în curând în Pernera.' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then '«سيركل بيرل ريزيدنسز» مشروع سكني بوتيكي قادم قريبًا في بيرنيرا.' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Circle Pearl Residences ist eine exklusive Wohnanlage im Boutique-Stil, die in Kürze in Pernera entsteht.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Circle Pearl Residences to butikowa inwestycja mieszkaniowa, która wkrótce powstanie w Pernerze.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Circle Pearl Residences — бутиковый жилой комплекс, который скоро появится в Пернере.' else summary_ru end
where slug = 'sweet-home-estates-circle-pearl-residences';
update public.directory_listings set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Το Serenity Pearl Residences είναι μια μπουτίκ ανάπτυξη σε φάση προ-λανσαρίσματος στο Καππαρής.' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Serenity Pearl Residences este un ansamblu boutique în fază de pre-lansare în Kapparis.' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then '«سيرينيتي بيرل ريزيدنسز» مشروع بوتيكي في مرحلة ما قبل الإطلاق في كابّاريس.' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Serenity Pearl Residences ist eine exklusive Wohnanlage in der Vorvermarktung in Kapparis.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Serenity Pearl Residences to butikowa inwestycja w fazie przedsprzedaży w Kapparis.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Serenity Pearl Residences — бутиковый комплекс на стадии предстарта продаж в Каппарисе.' else summary_ru end
where slug = 'sweet-home-estates-serenity-pearl-residences';
update public.directory_listings set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Το Royal Pearl Residences στον Πρωταρά είναι μια ανάπτυξη που έχει εξαντληθεί.' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Royal Pearl Residences din Protaras este un ansamblu complet vândut.' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then '«رويال بيرل ريزيدنسز» في بروتاراس مشروع نفدت وحداته بالكامل.' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Royal Pearl Residences in Protaras ist eine ausverkaufte Wohnanlage.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Royal Pearl Residences w Protaras to wyprzedana inwestycja.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Royal Pearl Residences в Протарасе — полностью распроданный комплекс.' else summary_ru end
where slug = 'sweet-home-estates-royal-pearl-residences';
update public.directory_listings set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Το White Pearl Residences στο Καππαρής είναι μια ανάπτυξη που έχει εξαντληθεί.' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'White Pearl Residences din Kapparis este un ansamblu complet vândut.' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then '«وايت بيرل ريزيدنسز» في كابّاريس مشروع نفدت وحداته بالكامل.' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'White Pearl Residences in Kapparis ist eine ausverkaufte Wohnanlage.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'White Pearl Residences w Kapparis to wyprzedana inwestycja.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'White Pearl Residences в Каппарисе — полностью распроданный комплекс.' else summary_ru end
where slug = 'sweet-home-estates-white-pearl-residences';
update public.directory_listings set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Το Vie Bleu Residences στον Πρωταρά είναι μια ολοκληρωμένη ανάπτυξη.' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Vie Bleu Residences din Protaras este un ansamblu finalizat.' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then '«في بلو ريزيدنسز» في بروتاراس مشروع مكتمل.' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Vie Bleu Residences in Protaras ist eine fertiggestellte Wohnanlage.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Vie Bleu Residences w Protaras to ukończona inwestycja.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Vie Bleu Residences в Протарасе — завершённый комплекс.' else summary_ru end
where slug = 'sweet-home-estates-vie-bleu-residences';
update public.directory_listings set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Σύγχρονα δωμάτια σε πολυτελές ξενοδοχείο με 5 εστιατόρια και σπα, καθώς και εσωτερικές και εξωτερικές πισίνες.' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Camere contemporane într-un hotel de lux cu 5 restaurante și spa, plus piscine interioare și exterioare.' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'غرف عصرية في فندق فاخر يضم 5 مطاعم ومنتجعًا صحيًا، إضافة إلى مسابح داخلية وخارجية.' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Zeitgemäße Zimmer in einem Luxushotel mit 5 Restaurants und einem Spa sowie Innen- und Außenpools.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Nowoczesne pokoje w luksusowym hotelu z 5 restauracjami i spa oraz basenami wewnętrznymi i zewnętrznymi.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Современные номера в роскошном отеле с 5 ресторанами и спа, а также крытыми и открытыми бассейнами.' else summary_ru end
where slug = 'amathus-beach-hotel-1dnt9k';
update public.directory_listings set
  summary_el = case when summary_el is null or btrim(summary_el) = '' or summary_el = summary_en then 'Εστιατόριο στη Λεμεσό.' else summary_el end,
  summary_ro = case when summary_ro is null or btrim(summary_ro) = '' or summary_ro = summary_en then 'Restaurant în Limassol.' else summary_ro end,
  summary_ar = case when summary_ar is null or btrim(summary_ar) = '' or summary_ar = summary_en then 'مطعم في ليماسول.' else summary_ar end,
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Restaurant in Limassol.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Restauracja w Limassol.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Ресторан в Лимассоле.' else summary_ru end
where slug = 'armonia-5575di';
update public.directory_listings set
  summary_de = case when summary_de is null or btrim(summary_de) = '' or summary_de = summary_en then 'Luxuriöses Spa-Hotel in einem traditionellen Dorf (Small Luxury Hotels) im Bergdorf Kalopanayiotis im Troodos-Gebirge, mit restaurierten Steinhäusern und dem Schwefelquellen-Spa Myrianthousa.' else summary_de end,
  summary_pl = case when summary_pl is null or btrim(summary_pl) = '' or summary_pl = summary_en then 'Luksusowy hotel spa w tradycyjnej wsi (Small Luxury Hotels) w górskiej wsi Kalopanayiotis w Troodos, z odrestaurowanymi kamiennymi pensjonatami i spa przy źródle siarkowym Myrianthousa.' else summary_pl end,
  summary_ru = case when summary_ru is null or btrim(summary_ru) = '' or summary_ru = summary_en then 'Роскошный спа-отель в традиционной деревне (Small Luxury Hotels) в горной деревне Калопанайотис в Троодосе, с отреставрированными каменными гостевыми домами и спа на сернистом источнике Мириантуса.' else summary_ru end
where slug = 'casale-panayiotis';
commit;
