import ContactForm from '@/components/ContactForm';

export const metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <div className="article wrap">
      <span className="kicker">Cyprus Lifestyle</span>
      <h1>Contact</h1>
      <p className="dek">Editorial, membership, or partnerships — write to us.</p>
      <ContactForm />
    </div>
  );
}
