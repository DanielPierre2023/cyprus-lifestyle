// Per-desk email signatures. Every outgoing address signs itself with the right
// identity — hello@ as the reader desk, privacy@ as data protection, advertise@/
// sales@ as partnerships, and so on — rendered in the house luxury style (serif
// name, gold role line, discreet contact). Kept in the brand's English as a
// letterhead would be, consistent across all seven editions. Resolved from the
// FROM address, so a reply sent from privacy@ is signed by Data Protection
// automatically, with no one having to remember.
import 'server-only';

export interface Desk { key: string; name: string; role: string; }

// Canonical desks.
const DESKS: Record<string, Desk> = {
  hello:     { key: 'hello',     name: 'The Cyprus Lifestyle Desk',      role: 'Reader & Concierge Services' },
  concierge: { key: 'concierge', name: 'The Cyprus Lifestyle Concierge', role: 'Concierge Services' },
  private:   { key: 'private',   name: 'The Private Client Desk',        role: 'Cyprus Lifestyle · By Appointment' },
  privacy:   { key: 'privacy',   name: 'Data Protection Office',         role: 'Cyprus Lifestyle' },
  advertise: { key: 'advertise', name: 'Partnerships',                   role: 'Advertising & Brand' },
  newsroom:  { key: 'newsroom',  name: 'The Newsroom',                   role: 'Cyprus Lifestyle Editorial' },
  editor:    { key: 'editor',    name: 'The Editor',                     role: 'Cyprus Lifestyle' },
  directory: { key: 'directory', name: 'The Directory Desk',             role: 'Listings & Verification' },
};

// Common local-part aliases → a canonical desk.
const ALIAS: Record<string, string> = {
  sales: 'advertise', ads: 'advertise', advertising: 'advertise', partnerships: 'advertise', partner: 'advertise',
  info: 'hello', contact: 'hello', support: 'hello', help: 'hello',
  gdpr: 'privacy', dpo: 'privacy', legal: 'privacy',
  press: 'newsroom', editorial: 'newsroom', news: 'newsroom',
  vip: 'private', concierge: 'concierge',
  listings: 'directory',
};

// Resolve the desk for an email address (or bare local-part). Unknown → hello.
export function deskFor(address: string): Desk {
  const local = String(address || '').split('@')[0].toLowerCase().trim().replace(/[<>]/g, '');
  const key = DESKS[local] ? local : (ALIAS[local] || 'hello');
  return DESKS[key];
}

// Luxury signature block (HTML) for a given FROM address, matching brandedEmail's
// palette. Placed at the foot of the message body.
export function signatureFor(address: string): string {
  const d = deskFor(address);
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
  const host = site.replace(/^https?:\/\//, '');
  const domain = (String(address).split('@')[1] || host).replace(/[<>]/g, '');
  const email = `${d.key}@${domain}`;
  const G = '#C9A24C', INK = '#16181C', MUT = '#6f6a5c', LINE = '#e7ddc6';
  const serif = "Georgia,'Times New Roman',serif";
  return `<div style="margin-top:30px;padding-top:18px;border-top:1px solid ${LINE};font-family:${serif}">
  <div style="font-size:16px;color:${INK}">${d.name}</div>
  <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${G};margin-top:3px">${d.role}</div>
  <div style="font-size:12px;color:${MUT};margin-top:9px"><a href="mailto:${email}" style="color:${MUT};text-decoration:none">${email}</a> &nbsp;·&nbsp; <a href="${site}" style="color:${MUT};text-decoration:none">${host}</a> &nbsp;·&nbsp; Nicosia, Cyprus</div>
</div>`;
}
