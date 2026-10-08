# Facebook & Instagram auto-posting — set-up and operation

## 1. What it does
* Every article that becomes **published** — written in the editor, an interview, a scraped story, anything that sets an article to "published" — is put in a queue **by the database itself** (no publishing path can forget it).
* The site works the queue every ~3 minutes and posts to your **Facebook Page** and **Instagram** account:
  * **Facebook:** a hook line, a short description, 3 relevant hashtags, and the article link (Facebook builds the preview card from the page's own tags).
  * **Instagram:** a hook (first 125 characters are what readers see), a short keyword-rich description, "link in bio" in the article's language, 5 hashtags, **alt text**, and a 4:5 picture (the article's own cover, smart-cropped; the branded text card if the cover is not ours).
* Language = the language the article was written in (English if that edition has no headline). Sponsored articles carry a "Sponsored" label in that language.
* Written by AI (OpenAI gpt-6-luna, a fraction of a cent per post). If the AI budget/kill-switch is off the post still goes out with the headline and description.
* Calm by design: at most **8 Facebook / 4 Instagram posts a day**, at least **30 minutes apart**, only articles **less than 36 hours old** (editable in Admin → Social). Temporary Meta errors are retried (10 min, 20, 40 …, 5 tries); token/permission errors stop and show in red.
* An article marked **"skip_facebook"** is never posted. Switch the whole thing off with the **Auto-post** tick in Admin → Social.

## 2. Posting EARLIER articles (from the backend)
Admin → **Social**:
* **Post earlier articles** → tick Facebook/Instagram, choose how many → *Queue earlier articles*. They are queued **newest first** and go out **gradually inside the daily limits** (so 74 articles ≈ 9 days on Facebook, 19 days on Instagram at the defaults — raise the limits if you want it faster; Instagram allows 100 API posts a day, Facebook has no fixed cap but too fast looks like spam).
* **Post a specific article** → search any published article → *Post now* (immediate; ignores the daily limit). If it was already posted you are asked before it is posted again.

## 3. One-time connection (about 30–45 minutes, free)
Meta does not allow shortcuts here; these steps are Meta's own. Do them with the Facebook account that **administers the Page**.
1. **Instagram → Professional account.** In the Instagram app: Settings → Account type and tools → *Switch to professional account* (Business or Creator).
2. **Link Instagram to the Facebook Page**: Facebook Page → Settings → Linked accounts → Instagram → Connect.
3. Create a **Meta developer app**: developers.facebook.com → My Apps → Create app → type *Business*. Add the products **Facebook Login for Business** and **Instagram** (API with Facebook Login).
4. Get a **Page access token** with these permissions: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish` (add `ads_management` + `ads_read` only if you got your Page role through Business Manager). Easiest: *Graph API Explorer* → pick your app → *Get User Access Token* with those permissions → exchange it for a **long-lived** token → call `GET /me/accounts`; the `access_token` shown for your Page is a **Page token that does not expire**.
5. Find the IDs: **Page ID** is in `/me/accounts`; **Instagram ID**: `GET /<PAGE_ID>?fields=instagram_business_account` → `id`.
6. If Facebook asks for **Page Publishing Authorization**, complete it (Meta requires it for some pages before anything can be published).
7. In Vercel → Environment Variables add: `META_PAGE_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` → Redeploy.
8. Admin → Social → **Test the connection**: you should see ✅ for both.

Because you only post to **your own** Page and Instagram account, the app can stay in *Development mode* (no Meta app review is needed for accounts that have a role on the app — you). If Meta ever changes this, the test button shows the exact message.

## 4. Switching on
1. Run `supabase/migrations/20261005150000_social_autopost.sql` in the Supabase SQL editor. From that moment, **newly** published articles are queued. Nothing already published is queued.
2. Deploy the package, connect Meta (section 3).
3. Optional: Admin → Social → *Queue earlier articles*.

## 5. If something goes wrong
| You see | Meaning / fix |
|---|---|
| Red "Failed posts" with "Meta token or permission problem" | The token expired or lacks a permission. Make a new Page token (3.4), update `META_PAGE_ACCESS_TOKEN`, redeploy, press *Retry all failed*. |
| Posts stay "waiting" | Daily limit/gap reached (normal), or the platform is not connected (the row says so). |
| Instagram: "could not process the image" | Instagram could not download `/api/social/image?...` — check the site is reachable from the internet and the article has a normal cover. |
| A story you do not want posted | Mark the article "do not post" (skip_facebook) before publishing, or press *Skip* on the waiting row. |

## 6. Honest limits
* "SEO" on social does not rank on Google. What helps is: a strong first line, natural keywords, a few relevant hashtags, alt text, a correct link preview and a trackable link. All of these are done; the article pages also now carry full article Open Graph data (published/modified time, section, tags, author, image alt) that Facebook and LinkedIn read.
* Links in Instagram captions are not clickable, hence "link in bio" — keep your bio link on the site (or a link page).
* Every link is tagged `utm_source=facebook|instagram&utm_medium=social&utm_campaign=autopost` so visits can be counted.
* Cost: Meta's APIs are free. The only cost is the AI copy (well under €0.01 a post).
