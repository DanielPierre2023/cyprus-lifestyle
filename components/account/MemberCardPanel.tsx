// The member card on /account (server component: the QR code is an inline SVG made on the server, no script ships for it).
import { qrSvg } from '@/lib/qr';
import { fillCard, type CardCopy } from '@/lib/member/cardCopy';
import { CardActions } from '@/components/account/CardActions';

export interface CardPanelProps {
  copy: CardCopy; verifyUrl: string; sinceYear: number | null; name: string | null;
  offers: { id: string; partner: string; text: string }[];
}

export default function MemberCardPanel({ copy, verifyUrl, sinceYear, name, offers }: CardPanelProps) {
  const svg = qrSvg(verifyUrl, { px: 200, dark: '#0B0E11', light: '#ffffff', label: copy.cQr });
  return (
    <section aria-labelledby="acct-card" style={{ border: '1px solid #C9A24C', borderRadius: 6, padding: '20px 22px', background: 'linear-gradient(180deg,#1c1710,#2a2114)', color: '#f1e9d8', marginBottom: 20 }}>
      <div className="kicker" id="acct-card" style={{ color: '#E9C978' }}>{copy.cTitle}</div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', margin: '12px 0 4px' }}>
        <div style={{ background: '#fff', padding: 8, borderRadius: 6, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
        <div style={{ flex: '1 1 180px', minWidth: 0 }}>
          <div style={{ fontSize: 22, color: '#fff' }}><b>{copy.cStatus}</b></div>
          {name ? <div style={{ fontSize: 17, marginTop: 2 }}>{name}</div> : null}
          {sinceYear ? <div style={{ fontSize: 14.5, color: '#c9bfa6', marginTop: 2 }}>{fillCard(copy.cSince, { year: sinceYear })}</div> : null}
        </div>
      </div>
      <p style={{ margin: '12px 0 6px', fontSize: 14.5, lineHeight: 1.55 }}>{offers.length ? copy.cIntroOffers : copy.cIntroNone}</p>
      <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.5, color: '#c9bfa6' }}>{copy.cShows}</p>
      <div className="kicker" style={{ color: '#E9C978' }}>{copy.cOffersTitle}</div>
      {offers.length === 0 ? <p style={{ margin: '6px 0 12px', fontSize: 14.5 }}>{copy.cOffersNone}</p> : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 12px' }}>
          {offers.map((o) => (
            <li key={o.id} style={{ padding: '7px 0', borderTop: '1px solid rgba(201,162,76,.22)', fontSize: 14.5 }}>
              <b>{o.partner}</b><br />{o.text}
            </li>
          ))}
        </ul>
      )}
      <CardActions
        initialName={name || ''} previewUrl={verifyUrl}
        labels={{ nameLabel: copy.cNameLabel, namePh: copy.cNamePh, save: copy.cNameSave, saved: copy.cNameSaved, invalid: copy.cNameInvalid, rotate: copy.cRotate, rotateConfirm: copy.cRotateConfirm, rotated: copy.cRotated, preview: copy.cPreview, error: copy.cError }}
      />
    </section>
  );
}
