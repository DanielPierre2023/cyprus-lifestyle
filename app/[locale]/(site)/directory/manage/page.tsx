// Owner manage page — the self-serve editor surface for a verified listing owner.
// There is NO owner login: we authenticate per-listing with the emailed management token.
// Flow:
//   1. On their listing, the owner clicks "Manage your listing" → lands here with ?slug=…
//      and no session → we show OwnerRequestLink (emails a secure link to the on-file owner).
//   2. They open the emailed link → /api/directory/owner/verify sets an httpOnly session
//      cookie and redirects here → we resolve the session to a slug and show OwnerEditor.
// This page reads a cookie, so it is always dynamic (never cached).
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getListing } from '@/lib/queries';
import { validateOwnerSession, getOwnerEditable, OWNER_COOKIE } from '@/lib/directory/owner';
import OwnerEditor from '@/components/OwnerEditor';
import OwnerRequestLink from '@/components/OwnerRequestLink';

export const dynamic = 'force-dynamic';

// A private operational surface — keep it out of search indexes.
export const metadata: Metadata = {
  title: 'Manage your listing — Cyprus Lifestyle',
  robots: { index: false, follow: false },
};

export default async function ManageListingPage({
  params, searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const { slug: querySlug } = await searchParams;

  // 1) An active editing session? → resolve it to the listing and show the editor.
  const session = (await cookies()).get(OWNER_COOKIE)?.value;
  const sessionSlug = await validateOwnerSession(session);
  const editable = sessionSlug ? await getOwnerEditable(sessionSlug) : null;

  return (
    <div className="wrap" style={{ paddingTop: 28, paddingBottom: 56 }}>
      <span className="kicker"><Link href="/directory">Directory</Link> · Manage your listing</span>

      {editable ? (
        <>
          <h1 style={{ margin: '12px 0 4px' }}>{editable.name}</h1>
          <p className="mg-sub">
            You’re signed in as the verified owner of this listing.
            {editable.type ? <> <Link href={`/directory/${editable.type}/${editable.slug}`}>View your public page →</Link></> : null}
          </p>
          <div style={{ marginTop: 22 }}>
            <OwnerEditor initial={editable} />
          </div>
        </>
      ) : (
        <ManageEntry locale={l} querySlug={querySlug} />
      )}

      <style>{`
        .mg-sub{font-family:var(--body);font-size:16px;color:var(--ink-soft,#5b5346);margin:0}
        .mg-sub a{color:#8a5b12;font-weight:600}
        .mg-generic{background:#fff;border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:22px 24px;max-width:560px;margin-top:16px}
        .mg-generic h2{font-family:var(--disp);font-weight:600;font-size:24px;margin:0 0 10px}
        .mg-generic p{font-family:var(--body);font-size:16px;line-height:1.6;color:var(--ink,#171310);margin:0 0 10px}
        .mg-generic a{color:#8a5b12;font-weight:600}
      `}</style>
    </div>
  );
}

// No active session: either show the "request a link" panel (when we arrived from a listing
// with ?slug=…) or a generic explainer. The request endpoint itself is anti-enumerating, so
// we may show the panel for any slug without leaking whether it is an owner profile.
async function ManageEntry({ locale, querySlug }: { locale: Locale; querySlug?: string }) {
  const slug = (querySlug || '').trim().slice(0, 200);
  if (slug) {
    const listing = await getListing(locale, slug).catch(() => null);
    return (
      <div style={{ marginTop: 20 }}>
        <OwnerRequestLink slug={slug} name={listing?.name} />
      </div>
    );
  }
  return (
    <div className="mg-generic">
      <h2>Manage your listing</h2>
      <p>Open the secure management link we emailed you to start editing. Links are valid for 60 minutes and can be used once.</p>
      <p>Don’t have one yet? Go to your business’s page in the directory and choose <b>“Own this business? Manage your listing.”</b></p>
      <p><Link href="/directory">Browse the directory →</Link></p>
    </div>
  );
}
