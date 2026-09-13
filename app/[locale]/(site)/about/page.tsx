export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <div className="page wrap">
      <div className="page-head">
        <span className="kicker">About</span>
        <h1>The island, in full colour</h1>
        <p className="dek">A premium magazine of property, culture and the good life across Cyprus.</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <div className="prose">
        <p>Cyprus Lifestyle is the record of how the island lives, invests and enjoys itself at the top end. Cyprus sits where Europe, the Levant and the Gulf meet, and this is the publication of that crossroads — glamorous like the fashion books, authoritative like the great living titles, and multilingual by birth.</p>
        <p>We publish in four languages: English as the international lead, Greek as the home edition, Romanian for the resident community, and Arabic for the Gulf. Every canonical story is translated across all four, right-to-left for the Arabic edition.</p>
        <p>Our desks cover Cyprus and politics, business and investment, property and architecture, culture and heritage, escapes and the sea, and the Cypriot table. Restraint reads as expensive; specifics read as true.</p>
      </div>
    </div>
  );
}
