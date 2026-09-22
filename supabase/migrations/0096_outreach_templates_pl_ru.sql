-- 0096_outreach_templates_pl_ru.sql
-- Complete the outreach language set to all seven editions: add Polish and Russian to
-- the four cadence emails (same concierge voice; placeholders + HTML preserved). Relies
-- on the (locale, step) unique index from 0095. Idempotent (upsert).

insert into public.crm_templates (locale, step, name, subject, body, active) values

-- ── Polish ───────────────────────────────────────────────────────────────────
('pl',1,'Step 1 · First contact (PL)', $s${{business}} — zaproszenie do Cyprus Lifestyle$s$, $b$<p>Szanowny/a {{first_name}},</p>
<p>Nazywam się {{sender_name}}, reprezentuję <em>Cyprus Lifestyle</em> — niezależny, siedmiojęzyczny przewodnik po dobrym życiu w Republice Cypryjskiej, czytany przez odwiedzających, nowych rezydentów i inwestorów, którzy wybierają wyspę.</p>
<p>Nie jesteśmy katalogiem. Każda firma, którą prezentujemy, jest zweryfikowana i wybrana ze względu na jakość, a nasz concierge poleca ją — z nazwy, w języku czytelnika — osobom, które aktywnie szukają zaufanego {{vertical_label}}. {{hook}}</p>
<p>{{business}} to dokładnie taka nazwa, o jaką nas pytają, i chciał(a)bym Państwa uwzględnić. Czy mogę przesłać, jak działa zweryfikowany profil — oraz, dopóki opracowujemy pierwsze wydania, miejsce partnera założycielskiego w cenie założycielskiej?</p>
<p>Wystarczy odpowiedzieć „proszę o szczegóły”.</p>
<p>Z wyrazami szacunku,<br>{{sender_name}}</p>$b$, true),
('pl',2,'Step 2 · Founding value (PL)', $s${{business}} — miejsce założycielskie, zanim otworzymy się dla wszystkich$s$, $b$<p>Szanowny/a {{first_name}},</p>
<p>W nawiązaniu do mojej wiadomości — kilka słów o tym, dlaczego {{business}} pasuje.</p>
<p>Zweryfikowany profil w Cyprus Lifestyle oznacza trzy rzeczy: staranny, redakcyjnie napisany wpis we wszystkich siedmiu wydaniach językowych; wyświetlanie Państwa danych przez concierge dokładnie wtedy, gdy ktoś szuka {{vertical_label}}; oraz dyskretną wiarygodność obecności w niezależnym przewodniku, który poleca ze względu na jakość — nigdy ze względu na to, kto zapłacił najwięcej.</p>
<p>Dopóki opracowujemy wydania startowe, mogę zarezerwować dla Państwa miejsce <strong>partnera założycielskiego</strong>: lepsza pozycja, w cenie założycielskiej w miarę naszego rozwoju. {{followup_angle}}</p>
<p>Czy mam przesłać jednostronicową prezentację?</p>
<p>Z wyrazami szacunku,<br>{{sender_name}}</p>$b$, true),
('pl',3,'Step 3 · Nudge (PL)', $s$Re: {{business}} × Cyprus Lifestyle$s$, $b$<p>Szanowny/a {{first_name}},</p>
<p>Krótkie przypomnienie — wiem, jak wypełnione są dni.</p>
<p>W skrócie: czytelnicy, którzy już szukają {{vertical_label}} na Cyprze, widzą {{business}} z nazwy, dzięki naszemu concierge, w swoim języku. Ciepłe rekomendacje dla osób z intencją — nie reklama wykrzykiwana do obcych.</p>
<p>Jeśli to Państwa interesuje, proszę odpowiedzieć „tak”, a prześlę szczegóły i zarezerwuję Państwa miejsce założycielskie. Jeśli to nie jest odpowiedni moment, proszę dać znać, a nie będę nalegać.</p>
<p>Z wyrazami szacunku,<br>{{sender_name}}</p>$b$, true),
('pl',4,'Step 4 · Close (PL)', $s$Czy mam zamknąć temat, {{first_name}}?$s$, $b$<p>Szanowny/a {{first_name}},</p>
<p>Nie chcę zapełniać Państwa skrzynki, więc to na razie moja ostatnia wiadomość.</p>
<p>Zaproszenie dla {{business}} pozostaje otwarte: zweryfikowane, redakcyjnie napisane miejsce w Cyprus Lifestyle, prezentowane przez naszego concierge czytelnikom w siedmiu językach, którzy aktywnie szukają {{vertical_label}}. Gdy nadejdzie właściwy moment, wystarczy odpowiedzieć, a natychmiast się tym zajmę — na warunkach założycielskich tam, gdzie to możliwe.</p>
<p>Z serdecznymi pozdrowieniami od całego zespołu Cyprus Lifestyle,<br>{{sender_name}}</p>$b$, true),

-- ── Russian ──────────────────────────────────────────────────────────────────
('ru',1,'Step 1 · First contact (RU)', $s${{business}} — приглашение в Cyprus Lifestyle$s$, $b$<p>Уважаемый(ая) {{first_name}},</p>
<p>Меня зовут {{sender_name}}, я представляю <em>Cyprus Lifestyle</em> — независимый семиязычный путеводитель по хорошей жизни в Республике Кипр, который читают гости, новые резиденты и инвесторы, выбирающие остров.</p>
<p>Мы не каталог. Каждый бизнес, который мы представляем, проверен и отобран по существу, и наш консьерж рекомендует его — по имени, на языке читателя — тем, кто активно ищет надёжного {{vertical_label}}. {{hook}}</p>
<p>{{business}} — именно то имя, о котором нас спрашивают, и я хотел(а) бы вас включить. Могу ли я прислать, как работает проверенный профиль, — и, пока мы готовим первые выпуски, место партнёра-основателя по тарифу основателя?</p>
<p>Достаточно ответить «расскажите подробнее».</p>
<p>С уважением,<br>{{sender_name}}</p>$b$, true),
('ru',2,'Step 2 · Founding value (RU)', $s${{business}} — место основателя до того, как мы откроемся для всех$s$, $b$<p>Уважаемый(ая) {{first_name}},</p>
<p>В продолжение моего письма — немного о том, почему {{business}} подходит.</p>
<p>Проверенный профиль в Cyprus Lifestyle означает три вещи: продуманную, редакционно написанную запись во всех семи языковых выпусках; показ ваших данных консьержем в тот самый момент, когда кто-то ищет {{vertical_label}}; и негромкую убедительность присутствия в независимом путеводителе, который рекомендует по существу — а не по тому, кто заплатил больше.</p>
<p>Пока мы готовим стартовые выпуски, я могу закрепить за вами место <strong>партнёра-основателя</strong>: лучшее размещение по тарифу основателя по мере нашего роста. {{followup_angle}}</p>
<p>Прислать вам одностраничное описание?</p>
<p>С уважением,<br>{{sender_name}}</p>$b$, true),
('ru',3,'Step 3 · Nudge (RU)', $s$Re: {{business}} × Cyprus Lifestyle$s$, $b$<p>Уважаемый(ая) {{first_name}},</p>
<p>Короткое напоминание — я знаю, насколько наполнены дни.</p>
<p>Вкратце: читателям, которые уже ищут {{vertical_label}} на Кипре, показывают {{business}} по имени, через нашего консьержа, на их языке. Тёплые рекомендации людям с намерением — а не реклама, выкрикиваемая незнакомцам.</p>
<p>Если это вам интересно, ответьте «да», и я пришлю детали и закреплю ваше место основателя. Если сейчас не время, скажите — и я не буду настаивать.</p>
<p>С уважением,<br>{{sender_name}}</p>$b$, true),
('ru',4,'Step 4 · Close (RU)', $s$Закрыть вопрос, {{first_name}}?$s$, $b$<p>Уважаемый(ая) {{first_name}},</p>
<p>Не хочу перегружать ваш почтовый ящик, поэтому это моё последнее письмо на данный момент.</p>
<p>Приглашение для {{business}} остаётся в силе: проверенное, редакционно написанное место в Cyprus Lifestyle, которое наш консьерж показывает читателям на семи языках, активно ищущим {{vertical_label}}. Когда придёт подходящий момент, просто ответьте — и я сразу возьмусь за это, на условиях основателя, где смогу.</p>
<p>С тёплыми пожеланиями от всей команды Cyprus Lifestyle,<br>{{sender_name}}</p>$b$, true)

on conflict (locale, step) do update set
  name = excluded.name, subject = excluded.subject, body = excluded.body, active = true, updated_at = now();

-- report
select locale, count(*) as steps from public.crm_templates group by locale order by locale;
