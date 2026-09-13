import ContactForm from '@/components/ContactForm';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <div className="page wrap">
      <div className="page-head">
        <span className="kicker">Cyprus Lifestyle</span>
        <h1>Contact</h1>
        <p className="dek">Editorial, membership, or partnerships — write to us.</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <ContactForm />
    </div>
  );
}
