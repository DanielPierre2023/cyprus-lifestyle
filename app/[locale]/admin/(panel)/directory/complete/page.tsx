import DirectoryCompleteListings from '@/components/admin/DirectoryCompleteListings';

export const dynamic = 'force-dynamic';

// Complete every listing — download what is missing (Excel + the scraper's website list),
// upload what was found (our sheet or the scraper's exports), check, apply. Only empty
// fields are ever filled. See lib/directory/enrichment*.ts.
export default function CompleteListingsPage() {
  return (
    <>
      <h1>Complete listings</h1>
      <p className="sub">
        Photos, phone, email, website, opening hours and social links for every business on the map. Download the list of what is
        missing, complete it (Google Places enrichment, the Ultimate Web Scraper on the businesses&rsquo; own websites, or by hand),
        then upload the results here. Only <strong>empty</strong> fields are filled — nothing already on file is overwritten.
      </p>
      <DirectoryCompleteListings />
    </>
  );
}
