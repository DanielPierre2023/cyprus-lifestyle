import ContactForm from '@/components/ContactForm';

export const metadata = { title: 'Advertise' };

export default function AdvertisePage() {
  return (
    <div className="article wrap">
      <span className="kicker">Partnerships</span>
      <h1>Advertise with Cyprus Lifestyle</h1>
      <div className="prose">
        <p>Reach international investors and relocators, the Cypriot elite, the Gulf&apos;s visitors and the Romanian professional community — across four editions. We offer homepage and in-article placements, newsletter sponsorship, and sponsored features.</p>
        <p>Tell us about your brand and we will send our current rate card.</p>
      </div>
      <ContactForm />
    </div>
  );
}
