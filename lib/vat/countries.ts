// lib/vat/countries.ts
// ============================================================================
// Country data shared by the checkout form (client) and the VAT logic (server).
// Pure, dependency-free.
//
//   • COUNTRY_CODES — every ISO 3166-1 alpha-2 code, for the buyer's "country" select.
//     Display names are NOT stored here: the form renders them in the visitor's language with
//     Intl.DisplayNames(locale, { type: 'region' }), so all 7 editions need no translation table.
//   • EU_VAT_PREFIX — the EU member states and the prefix their VAT numbers carry in VIES.
//     Two differ from the ISO code: Greece is "EL" (not GR). Northern Ireland ("XI") is deliberately
//     absent: VIES only covers goods there, so it cannot support a reverse charge on services.
// ============================================================================

export const COUNTRY_CODES: readonly string[] = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ',
  'CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR',
  'GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP',
  'KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT',
  'MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ',
  'UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW',
];

/** ISO country code → the prefix of that country's VAT numbers in VIES. */
export const EU_VAT_PREFIX: Readonly<Record<string, string>> = {
  AT: 'AT', BE: 'BE', BG: 'BG', HR: 'HR', CY: 'CY', CZ: 'CZ', DK: 'DK', EE: 'EE', FI: 'FI', FR: 'FR',
  DE: 'DE', GR: 'EL', HU: 'HU', IE: 'IE', IT: 'IT', LV: 'LV', LT: 'LT', LU: 'LU', MT: 'MT', NL: 'NL',
  PL: 'PL', PT: 'PT', RO: 'RO', SK: 'SK', SI: 'SI', ES: 'ES', SE: 'SE',
};

/** The seller's country: its customers' VAT is domestic, never a reverse charge. */
export const SELLER_COUNTRY = (process.env.SELLER_COUNTRY || 'CY').toUpperCase();

export const isCountryCode = (c: unknown): c is string => typeof c === 'string' && COUNTRY_CODES.includes(c.toUpperCase());
export const isEuMemberState = (c: unknown): boolean => typeof c === 'string' && Object.prototype.hasOwnProperty.call(EU_VAT_PREFIX, c.toUpperCase());
export const vatPrefixOf = (country: string): string | null => EU_VAT_PREFIX[country.toUpperCase()] ?? null;
