import { supabaseServer } from '@/lib/supabase/server';
import { vatConfigStatus } from '@/lib/vat/status';
import { EXPECTATION_TEXT } from '@/lib/vat/scenarios';
import type { VatExpectation } from '@/lib/vat/treatment';
import VatCheck from '@/components/admin/VatCheck';

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string; created_at: string; label: string | null; slot: string | null; status: string; customer_email: string | null; company: string | null;
  buyer_country: string | null; vat_status: string | null; vat_expectation: string | null; billing_country: string | null;
  amount_subtotal: number | null; amount_tax: number | null; amount_total: number | null; vat_alert: string | null;
};

const money = (n: number | null) => (n == null ? '—' : `€${Number(n).toFixed(2)}`);

export default async function VatCheckTab() {
  const cfg = vatConfigStatus();
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('ad_orders')
    .select('id, created_at, label, slot, status, customer_email, company, buyer_country, vat_status, vat_expectation, billing_country, amount_subtotal, amount_tax, amount_total, vat_alert')
    .order('created_at', { ascending: false })
    .limit(30);
  const orders = (data as OrderRow[] | null) || [];
  const alerts = orders.filter((o) => o.vat_alert);

  return (
    <>
      <h1>VAT check</h1>
      <p className="sub">Is VAT handled the way it was agreed? This page shows the current switches, lets you test the six typical buyers against Stripe Tax, and lists the VAT evidence kept for every advertising order.</p>

      <div className="cards">
        <div className="stat"><div className="n">{cfg.stripeConfigured ? cfg.stripeMode.toUpperCase() : '—'}</div><div className="k">Stripe key</div></div>
        <div className="stat"><div className="n" style={{ color: cfg.automaticTax ? '#1c6b34' : '#9a2020' }}>{cfg.automaticTax ? 'ON' : 'OFF'}</div><div className="k">VAT calculation</div></div>
        <div className="stat"><div className="n">{cfg.sellerCountry}</div><div className="k">Seller country</div></div>
        <div className="stat"><div className="n">{cfg.viesRequesterConfigured ? 'Yes' : 'No'}</div><div className="k">VIES evidence no.</div></div>
        <div className="stat"><div className="n" style={{ color: alerts.length ? '#9a2020' : undefined }}>{alerts.length}</div><div className="k">Orders with VAT alert</div></div>
      </div>

      {cfg.warnings.length ? (
        <div style={{ background: '#fdf0d6', border: '1px solid #ecd9a8', borderRadius: 4, padding: '12px 16px', marginBottom: 18 }}>
          {cfg.warnings.map((w, i) => <div key={i} style={{ fontSize: 13.5, margin: '3px 0' }}>⚠ {w}</div>)}
        </div>
      ) : null}

      <h1 style={{ fontSize: 18 }}>Test the rules against Stripe</h1>
      <VatCheck automaticTax={cfg.automaticTax} />

      <h1 style={{ fontSize: 18, marginTop: 30 }}>Latest advertising orders — VAT evidence</h1>
      {error ? (
        <p className="sub">The VAT columns are not in the database yet. Run <code>supabase/migrations/20261005130000_vat_evidence.sql</code> in the Supabase SQL editor, then reload this page. ({error.message})</p>
      ) : (
        <>
          <p className="sub">What the buyer declared, what the EU’s VIES register said about their VAT number, what we expected Stripe to do, and what Stripe really charged. A red alert means Stripe’s answer differs from the expectation — fix the Stripe set-up (docs/VAT-SETUP.md) and tell your accountant.</p>
          <table className="adm-t">
            <thead><tr><th>Date</th><th>Order</th><th>Buyer</th><th>VAT number</th><th>Expected</th><th>Charged (net · VAT · total)</th><th>Alert</th></tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.created_at).toLocaleDateString('en-GB')}</td>
                  <td>{o.label || o.slot || '—'}<div style={{ fontSize: 11.5, opacity: .6 }}>{o.status}</div></td>
                  <td>{o.company || o.customer_email || '—'}<div style={{ fontSize: 11.5, opacity: .6 }}>declared {o.buyer_country || '—'}{o.billing_country && o.billing_country !== o.buyer_country ? ` · billing ${o.billing_country}` : ''}</div></td>
                  <td>{o.vat_status ? <span className={`pill ${o.vat_status === 'valid' ? 'ok' : o.vat_status === 'none' ? 'info' : 'warn'}`}>{o.vat_status}</span> : '—'}</td>
                  <td style={{ fontSize: 12.5, maxWidth: 240 }}>{o.vat_expectation ? (EXPECTATION_TEXT[o.vat_expectation as VatExpectation] || o.vat_expectation) : '—'}</td>
                  <td>{o.amount_total == null ? '—' : `${money(o.amount_subtotal)} · ${money(o.amount_tax)} · ${money(o.amount_total)}`}</td>
                  <td>{o.vat_alert ? <span className="pill failed" title={o.vat_alert}>ALERT</span> : '—'}{o.vat_alert ? <div style={{ fontSize: 11.5, maxWidth: 260, color: '#9a2020' }}>{o.vat_alert}</div> : null}</td>
                </tr>
              ))}
              {orders.length === 0 ? <tr><td colSpan={7}>No advertising orders yet.</td></tr> : null}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
