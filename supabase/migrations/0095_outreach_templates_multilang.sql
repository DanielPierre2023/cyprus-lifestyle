-- 0095_outreach_templates_multilang.sql
-- Multilingual outreach: reach each business owner in their own language. Adds a
-- `locale` to crm_templates and an `outreach_locale` to crm_orgs, then seeds the four
-- cadence emails in EN, EL, RO, AR and DE (translations of the v2 voice; placeholders
-- and HTML preserved). The engine (lib/outreach.ts) picks the template for the org's
-- outreach_locale, falling back to EN. Idempotent (upsert on locale+step).

alter table public.crm_templates add column if not exists locale text not null default 'en';
alter table public.crm_orgs      add column if not exists outreach_locale text;   -- null → EN at send time

-- Drop the old one-template-per-step uniqueness (it blocks multiple locales per step);
-- the new key is (locale, step). Handle it whether it was a constraint or a bare index.
alter table public.crm_templates drop constraint if exists crm_templates_step_uidx;
drop index if exists public.crm_templates_step_uidx;

-- Collapse any accidental duplicates so (locale, step) can be unique.
delete from public.crm_templates a using public.crm_templates b
 where a.locale = b.locale and a.step = b.step and a.ctid < b.ctid;
create unique index if not exists crm_templates_locale_step_uidx on public.crm_templates (locale, step);

insert into public.crm_templates (locale, step, name, subject, body, active) values

-- ── English (re-assert v2) ───────────────────────────────────────────────────
('en',1,'Step 1 · First contact (EN)', $s${{business}} — an invitation to Cyprus Lifestyle$s$, $b$<p>Dear {{first_name}},</p>
<p>I'm {{sender_name}}, of <em>Cyprus Lifestyle</em> — the independent, seven-language guide to living well in the Republic of Cyprus, read by the visitors, new residents and investors choosing the island.</p>
<p>We're not a directory. Every name we feature is verified and chosen on merit, and our concierge recommends them — by name, in the reader's own language — to people who are actively asking for a trusted {{vertical_label}}. {{hook}}</p>
<p>{{business}} is precisely the kind of name they ask us for, and I'd like to include you. May I send you how a verified profile works — and, while we curate the first editions, a founding-partner place kept at the founding rate?</p>
<p>A simple "tell me more" is all I need.</p>
<p>Warmly,<br>{{sender_name}}</p>$b$, true),
('en',2,'Step 2 · Founding value (EN)', $s${{business}} — a founding place before we open to all$s$, $b$<p>Dear {{first_name}},</p>
<p>Following my note, a little more on why {{business}} fits.</p>
<p>A verified Cyprus Lifestyle profile means three things: a considered, editor-written entry across all seven language editions; your details surfaced by our concierge the moment a reader asks for a {{vertical_label}}; and the quiet credibility of appearing in an independent guide that recommends on merit — never on who paid the most.</p>
<p>While we curate the launch editions I can hold a <strong>founding-partner</strong> place for you: better positioning, kept at the founding rate as we grow. {{followup_angle}}</p>
<p>Shall I send the one-page detail?</p>
<p>Warmly,<br>{{sender_name}}</p>$b$, true),
('en',3,'Step 3 · Nudge (EN)', $s$Re: {{business}} × Cyprus Lifestyle$s$, $b$<p>Dear {{first_name}},</p>
<p>A brief follow-up — I know the days are full.</p>
<p>The short version: readers already looking for a {{vertical_label}} in Cyprus are shown {{business}} by name, by our concierge, in their own language. Warm introductions to people with intent — not advertising shouted at strangers.</p>
<p>If it's of interest, reply "yes" and I'll send the details and reserve your founding place. If the timing isn't right, tell me and I won't chase.</p>
<p>Warmly,<br>{{sender_name}}</p>$b$, true),
('en',4,'Step 4 · Close (EN)', $s$Shall I close the loop, {{first_name}}?$s$, $b$<p>Dear {{first_name}},</p>
<p>I don't want to crowd your inbox, so this is my last note for now.</p>
<p>The invitation for {{business}} stays open: a verified, editor-written place in Cyprus Lifestyle, surfaced by our concierge to readers across seven languages who are actively looking for a {{vertical_label}}. When the moment is right, simply reply and I'll pick it straight up — founding terms held wherever I can.</p>
<p>With warm regards from all of us at Cyprus Lifestyle,<br>{{sender_name}}</p>$b$, true),

-- ── Greek ────────────────────────────────────────────────────────────────────
('el',1,'Step 1 · First contact (EL)', $s${{business}} — μια πρόσκληση στο Cyprus Lifestyle$s$, $b$<p>Αγαπητέ/ή {{first_name}},</p>
<p>Είμαι ο/η {{sender_name}}, από το <em>Cyprus Lifestyle</em> — τον ανεξάρτητο, επτάγλωσσο οδηγό για την καλή ζωή στην Κυπριακή Δημοκρατία, που διαβάζουν οι επισκέπτες, οι νέοι κάτοικοι και οι επενδυτές που επιλέγουν το νησί.</p>
<p>Δεν είμαστε κατάλογος. Κάθε επιχείρηση που προβάλλουμε είναι επαληθευμένη και επιλέγεται με κριτήριο την αξία της, και ο concierge μας τη συστήνει — ονομαστικά, στη γλώσσα του αναγνώστη — σε όσους αναζητούν ενεργά έναν αξιόπιστο {{vertical_label}}. {{hook}}</p>
<p>Το {{business}} είναι ακριβώς το είδος του ονόματος που μας ζητούν, και θα ήθελα να σας συμπεριλάβω. Να σας στείλω πώς λειτουργεί ένα επαληθευμένο προφίλ — και, όσο επιμελούμαστε τις πρώτες εκδόσεις, μια θέση ιδρυτικού συνεργάτη στην ιδρυτική τιμή;</p>
<p>Ένα απλό «πείτε μου περισσότερα» αρκεί.</p>
<p>Με εκτίμηση,<br>{{sender_name}}</p>$b$, true),
('el',2,'Step 2 · Founding value (EL)', $s${{business}} — μια ιδρυτική θέση πριν ανοίξουμε σε όλους$s$, $b$<p>Αγαπητέ/ή {{first_name}},</p>
<p>Σε συνέχεια του μηνύματός μου, λίγα λόγια ακόμη για το γιατί ταιριάζει το {{business}}.</p>
<p>Ένα επαληθευμένο προφίλ στο Cyprus Lifestyle σημαίνει τρία πράγματα: μια προσεγμένη, συντακτικά γραμμένη καταχώρηση και στις επτά γλωσσικές εκδόσεις· την προβολή των στοιχείων σας από τον concierge τη στιγμή που κάποιος ζητά έναν {{vertical_label}}· και τη διακριτική αξιοπιστία της παρουσίας σε έναν ανεξάρτητο οδηγό που συστήνει με βάση την αξία — ποτέ με βάση το ποιος πλήρωσε περισσότερα.</p>
<p>Όσο επιμελούμαστε τις εκδόσεις εκκίνησης, μπορώ να κρατήσω για εσάς μια θέση <strong>ιδρυτικού συνεργάτη</strong>: καλύτερη προβολή, στην ιδρυτική τιμή καθώς μεγαλώνουμε. {{followup_angle}}</p>
<p>Να σας στείλω τη μονοσέλιδη παρουσίαση;</p>
<p>Με εκτίμηση,<br>{{sender_name}}</p>$b$, true),
('el',3,'Step 3 · Nudge (EL)', $s$Re: {{business}} × Cyprus Lifestyle$s$, $b$<p>Αγαπητέ/ή {{first_name}},</p>
<p>Μια σύντομη υπενθύμιση — ξέρω πόσο γεμάτες είναι οι μέρες.</p>
<p>Με λίγα λόγια: αναγνώστες που ήδη αναζητούν έναν {{vertical_label}} στην Κύπρο βλέπουν το {{business}} ονομαστικά, μέσω του concierge μας, στη δική τους γλώσσα. Θερμές συστάσεις σε ανθρώπους με πρόθεση — όχι διαφήμιση σε αγνώστους.</p>
<p>Αν σας ενδιαφέρει, απαντήστε «ναι» και θα σας στείλω τις λεπτομέρειες κρατώντας την ιδρυτική σας θέση. Αν η στιγμή δεν είναι κατάλληλη, πείτε μου και δεν θα επιμείνω.</p>
<p>Με εκτίμηση,<br>{{sender_name}}</p>$b$, true),
('el',4,'Step 4 · Close (EL)', $s$Να κλείσω το θέμα, {{first_name}};$s$, $b$<p>Αγαπητέ/ή {{first_name}},</p>
<p>Δεν θέλω να επιβαρύνω τα εισερχόμενά σας, οπότε αυτό είναι το τελευταίο μου μήνυμα προς το παρόν.</p>
<p>Η πρόσκληση για το {{business}} παραμένει ανοιχτή: μια επαληθευμένη, συντακτικά γραμμένη θέση στο Cyprus Lifestyle, που προβάλλεται από τον concierge μας σε αναγνώστες επτά γλωσσών οι οποίοι αναζητούν ενεργά έναν {{vertical_label}}. Όποτε είναι η κατάλληλη στιγμή, απλώς απαντήστε και θα το αναλάβω αμέσως — με τους ιδρυτικούς όρους όπου μπορώ.</p>
<p>Με θερμούς χαιρετισμούς από όλους εμάς στο Cyprus Lifestyle,<br>{{sender_name}}</p>$b$, true),

-- ── Romanian ─────────────────────────────────────────────────────────────────
('ro',1,'Step 1 · First contact (RO)', $s${{business}} — o invitație în Cyprus Lifestyle$s$, $b$<p>Stimate/ă {{first_name}},</p>
<p>Sunt {{sender_name}}, de la <em>Cyprus Lifestyle</em> — ghidul independent, în șapte limbi, despre viața frumoasă în Republica Cipru, citit de vizitatorii, noii rezidenți și investitorii care aleg insula.</p>
<p>Nu suntem un director. Fiecare afacere pe care o prezentăm este verificată și aleasă pe merit, iar concierge-ul nostru o recomandă — pe nume, în limba cititorului — celor care caută activ un {{vertical_label}} de încredere. {{hook}}</p>
<p>{{business}} este exact genul de nume pe care ni-l cer, și aș dori să vă includ. Pot să vă trimit cum funcționează un profil verificat — și, cât timp pregătim primele ediții, un loc de partener fondator păstrat la tariful de fondator?</p>
<p>Un simplu „spuneți-mi mai multe” este suficient.</p>
<p>Cu stimă,<br>{{sender_name}}</p>$b$, true),
('ro',2,'Step 2 · Founding value (RO)', $s${{business}} — un loc de fondator înainte de a deschide tuturor$s$, $b$<p>Stimate/ă {{first_name}},</p>
<p>În continuarea mesajului meu, câteva cuvinte despre de ce se potrivește {{business}}.</p>
<p>Un profil verificat în Cyprus Lifestyle înseamnă trei lucruri: o prezentare îngrijită, redactată editorial, în toate cele șapte ediții lingvistice; afișarea datelor dumneavoastră de către concierge chiar în momentul în care cineva caută un {{vertical_label}}; și credibilitatea discretă a prezenței într-un ghid independent care recomandă pe merit — niciodată după cine a plătit mai mult.</p>
<p>Cât timp pregătim edițiile de lansare, pot păstra pentru dumneavoastră un loc de <strong>partener fondator</strong>: poziționare mai bună, la tariful de fondator pe măsură ce creștem. {{followup_angle}}</p>
<p>Să vă trimit prezentarea de o pagină?</p>
<p>Cu stimă,<br>{{sender_name}}</p>$b$, true),
('ro',3,'Step 3 · Nudge (RO)', $s$Re: {{business}} × Cyprus Lifestyle$s$, $b$<p>Stimate/ă {{first_name}},</p>
<p>O revenire scurtă — știu cât de pline sunt zilele.</p>
<p>Pe scurt: cititori care caută deja un {{vertical_label}} în Cipru văd {{business}} pe nume, prin concierge-ul nostru, în limba lor. Recomandări calde către oameni cu intenție — nu reclamă strigată către necunoscuți.</p>
<p>Dacă vă interesează, răspundeți „da” și vă trimit detaliile, rezervându-vă locul de fondator. Dacă nu e momentul potrivit, spuneți-mi și nu voi insista.</p>
<p>Cu stimă,<br>{{sender_name}}</p>$b$, true),
('ro',4,'Step 4 · Close (RO)', $s$Să închid subiectul, {{first_name}}?$s$, $b$<p>Stimate/ă {{first_name}},</p>
<p>Nu vreau să vă aglomerez inboxul, așa că acesta este ultimul meu mesaj deocamdată.</p>
<p>Invitația pentru {{business}} rămâne deschisă: un loc verificat, redactat editorial, în Cyprus Lifestyle, afișat de concierge-ul nostru cititorilor din șapte limbi care caută activ un {{vertical_label}}. Când va fi momentul potrivit, răspundeți și voi relua imediat — cu condițiile de fondator acolo unde pot.</p>
<p>Cu salutări calde din partea întregii echipe Cyprus Lifestyle,<br>{{sender_name}}</p>$b$, true),

-- ── Arabic (RTL) ─────────────────────────────────────────────────────────────
('ar',1,'Step 1 · First contact (AR)', $s${{business}} — دعوة إلى Cyprus Lifestyle$s$, $b$<p>عزيزي/عزيزتي {{first_name}}،</p>
<p>أنا {{sender_name}} من <em>Cyprus Lifestyle</em> — الدليل المستقل بسبع لغات لأسلوب حياة راقٍ في جمهورية قبرص، يقرأه الزوار والمقيمون الجدد والمستثمرون الذين يختارون الجزيرة.</p>
<p>نحن لسنا دليلاً عادياً. كل نشاط نعرضه مُوثَّق ومُختار على أساس الجدارة، ويوصي به الكونسيرج لدينا — بالاسم، وبلغة القارئ — لمن يبحثون فعلياً عن {{vertical_label}} موثوق. {{hook}}</p>
<p>{{business}} هو تماماً نوع الاسم الذي يسألوننا عنه، وأودّ أن أضمّكم. هل أرسل لكم كيف يعمل الملف المُوثَّق — ومقعد شريك مؤسِّس بسعر التأسيس بينما نُعِدّ الإصدارات الأولى؟</p>
<p>يكفي أن تردّوا بعبارة «أخبرني المزيد».</p>
<p>مع خالص التقدير،<br>{{sender_name}}</p>$b$, true),
('ar',2,'Step 2 · Founding value (AR)', $s${{business}} — مقعد تأسيسي قبل أن نفتح للجميع$s$, $b$<p>عزيزي/عزيزتي {{first_name}}،</p>
<p>إلحاقاً برسالتي، بعض التفاصيل عن سبب ملاءمة {{business}}.</p>
<p>الملف المُوثَّق في Cyprus Lifestyle يعني ثلاثة أمور: إدراجاً مصاغاً تحريرياً بعناية عبر الإصدارات السبعة كلها؛ وإبراز بياناتكم عبر الكونسيرج لحظة أن يطلب أحدهم {{vertical_label}}؛ والمصداقية الهادئة للظهور في دليل مستقل يوصي على أساس الجدارة — لا على أساس من دفع أكثر.</p>
<p>بينما نُعِدّ إصدارات الإطلاق، يمكنني أن أحجز لكم مقعد <strong>شريك مؤسِّس</strong>: مكانة أفضل، بسعر التأسيس مع نمونا. {{followup_angle}}</p>
<p>هل أرسل لكم العرض المختصر في صفحة واحدة؟</p>
<p>مع خالص التقدير،<br>{{sender_name}}</p>$b$, true),
('ar',3,'Step 3 · Nudge (AR)', $s$Re: {{business}} × Cyprus Lifestyle$s$, $b$<p>عزيزي/عزيزتي {{first_name}}،</p>
<p>متابعة قصيرة — أعلم كم أن الأيام مزدحمة.</p>
<p>باختصار: قُرّاء يبحثون بالفعل عن {{vertical_label}} في قبرص يُعرَض عليهم {{business}} بالاسم، عبر الكونسيرج لدينا، وبلغتهم. تعريفات ودّية لأشخاص لديهم نية — لا إعلان يُصاح به في وجه الغرباء.</p>
<p>إن كان الأمر يهمّكم، ردّوا بـ«نعم» وسأرسل التفاصيل مع حجز مقعدكم التأسيسي. وإن لم يكن الوقت مناسباً، أخبروني ولن أُلِحّ.</p>
<p>مع خالص التقدير،<br>{{sender_name}}</p>$b$, true),
('ar',4,'Step 4 · Close (AR)', $s$هل أُغلق الموضوع، {{first_name}}؟$s$, $b$<p>عزيزي/عزيزتي {{first_name}}،</p>
<p>لا أريد أن أُثقل بريدكم، لذا هذه رسالتي الأخيرة في الوقت الحالي.</p>
<p>تبقى الدعوة إلى {{business}} قائمة: مكان مُوثَّق ومصاغ تحريرياً في Cyprus Lifestyle، يُبرزه الكونسيرج لقُرّاء بسبع لغات يبحثون فعلياً عن {{vertical_label}}. متى حان الوقت المناسب، ردّوا فحسب وسأتابع فوراً — بشروط التأسيس حيثما أمكن.</p>
<p>مع أطيب التحيات من فريق Cyprus Lifestyle بأكمله،<br>{{sender_name}}</p>$b$, true),

-- ── German ───────────────────────────────────────────────────────────────────
('de',1,'Step 1 · First contact (DE)', $s${{business}} — eine Einladung zu Cyprus Lifestyle$s$, $b$<p>Sehr geehrte(r) {{first_name}},</p>
<p>ich bin {{sender_name}} von <em>Cyprus Lifestyle</em> — dem unabhängigen, siebensprachigen Führer für ein gutes Leben in der Republik Zypern, gelesen von den Besuchern, Neubürgern und Investoren, die sich für die Insel entscheiden.</p>
<p>Wir sind kein Branchenverzeichnis. Jeder Name, den wir vorstellen, ist geprüft und nach Qualität ausgewählt, und unser Concierge empfiehlt ihn — namentlich, in der Sprache des Lesers — Menschen, die aktiv einen vertrauenswürdigen {{vertical_label}} suchen. {{hook}}</p>
<p>{{business}} ist genau die Art von Name, nach der man uns fragt, und ich würde Sie gern aufnehmen. Darf ich Ihnen zusenden, wie ein geprüftes Profil funktioniert — und, solange wir die ersten Ausgaben kuratieren, einen Gründungspartner-Platz zum Gründungstarif?</p>
<p>Ein schlichtes „Erzählen Sie mir mehr“ genügt.</p>
<p>Herzliche Grüße,<br>{{sender_name}}</p>$b$, true),
('de',2,'Step 2 · Founding value (DE)', $s${{business}} — ein Gründungsplatz, bevor wir für alle öffnen$s$, $b$<p>Sehr geehrte(r) {{first_name}},</p>
<p>im Anschluss an meine Nachricht ein paar Worte dazu, warum {{business}} passt.</p>
<p>Ein geprüftes Cyprus-Lifestyle-Profil bedeutet dreierlei: einen sorgfältigen, redaktionell verfassten Eintrag in allen sieben Sprachausgaben; die Anzeige Ihrer Angaben durch unseren Concierge genau dann, wenn jemand einen {{vertical_label}} sucht; und die stille Glaubwürdigkeit, in einem unabhängigen Führer zu erscheinen, der nach Qualität empfiehlt — nie danach, wer am meisten gezahlt hat.</p>
<p>Während wir die Startausgaben kuratieren, kann ich Ihnen einen <strong>Gründungspartner</strong>-Platz reservieren: bessere Platzierung, zum Gründungstarif, während wir wachsen. {{followup_angle}}</p>
<p>Soll ich Ihnen die einseitige Übersicht schicken?</p>
<p>Herzliche Grüße,<br>{{sender_name}}</p>$b$, true),
('de',3,'Step 3 · Nudge (DE)', $s$Re: {{business}} × Cyprus Lifestyle$s$, $b$<p>Sehr geehrte(r) {{first_name}},</p>
<p>eine kurze Rückmeldung — ich weiß, wie voll die Tage sind.</p>
<p>Kurz gesagt: Lesern, die bereits einen {{vertical_label}} in Zypern suchen, wird {{business}} namentlich angezeigt, durch unseren Concierge, in ihrer eigenen Sprache. Warme Empfehlungen an Menschen mit Absicht — keine Werbung, die Fremden zugerufen wird.</p>
<p>Wenn es Sie interessiert, antworten Sie mit „ja“, und ich sende die Einzelheiten und reserviere Ihren Gründungsplatz. Passt der Zeitpunkt nicht, sagen Sie es mir, und ich hake nicht nach.</p>
<p>Herzliche Grüße,<br>{{sender_name}}</p>$b$, true),
('de',4,'Step 4 · Close (DE)', $s$Soll ich es abschließen, {{first_name}}?$s$, $b$<p>Sehr geehrte(r) {{first_name}},</p>
<p>ich möchte Ihr Postfach nicht überladen, daher ist dies vorerst meine letzte Nachricht.</p>
<p>Die Einladung für {{business}} bleibt bestehen: ein geprüfter, redaktionell verfasster Platz in Cyprus Lifestyle, der von unserem Concierge Lesern in sieben Sprachen angezeigt wird, die aktiv einen {{vertical_label}} suchen. Wenn der richtige Moment kommt, antworten Sie einfach, und ich nehme es sofort auf — zu Gründungskonditionen, wo ich kann.</p>
<p>Mit herzlichen Grüßen von uns allen bei Cyprus Lifestyle,<br>{{sender_name}}</p>$b$, true)

on conflict (locale, step) do update set
  name = excluded.name, subject = excluded.subject, body = excluded.body, active = true, updated_at = now();

-- Extend bulk enrol with an optional outreach language: when p_locale is given, stamp
-- outreach_locale on every matching account (so they're contacted in that language), then
-- enrol the eligible ones. Drop the old signatures first (adding a param = new overload).
drop function if exists public.enroll_prospects_bulk(text, text, text, text);
drop function if exists public.enroll_prospects_bulk(text, text, text, text, text);
create or replace function public.enroll_prospects_bulk(
  p_category text default null,
  p_tier     text default null,
  p_stage    text default null,
  p_q        text default null,
  p_locale   text default null
) returns integer language plpgsql as $$
declare n integer;
begin
  if p_locale is not null and p_locale <> '' then
    update public.crm_orgs o set outreach_locale = p_locale
    where (p_category is null or p_category = 'all' or o.category = p_category)
      and (p_tier     is null or p_tier = 'all'     or o.tier = p_tier)
      and (p_stage    is null or p_stage = 'all'    or o.status = p_stage)
      and (p_q is null or p_q = '' or o.name ilike '%' || p_q || '%' or o.district ilike '%' || p_q || '%');
  end if;
  with ins as (
    insert into public.crm_enrollments (org_id, status, step, next_send_at)
    select o.id, 'active', 0, now()
    from public.crm_orgs o
    where (p_category is null or p_category = 'all' or o.category = p_category)
      and (p_tier     is null or p_tier = 'all'     or o.tier = p_tier)
      and (p_stage    is null or p_stage = 'all'    or o.status = p_stage)
      and (p_q is null or p_q = '' or o.name ilike '%' || p_q || '%' or o.district ilike '%' || p_q || '%')
      and exists (
        select 1 from public.crm_contacts c
        where c.org_id = o.id and c.email is not null
          and coalesce(c.consent_status, '') not in ('opted_out', 'unsubscribed')
          and not exists (select 1 from public.crm_suppression s
                          where s.email = c.email or s.domain = split_part(c.email, '@', 2))
      )
      and not exists (select 1 from public.crm_enrollments e where e.org_id = o.id)
    on conflict (org_id) do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $$;

-- report
select locale, count(*) as steps from public.crm_templates group by locale order by locale;
