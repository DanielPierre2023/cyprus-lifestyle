// Cyprus coastal climate, month by month (Ayia Napa / Larnaca / Paphos coast).
// Typical figures — day-high air °C, night-low, sea °C, a swim verdict and a
// rough rain level — the answer to the single most-asked visitor question
// ("what's the weather / can I swim in <month>?"). Month names localise at
// render time; these numbers are climate normals, not a live forecast.
export type Swim = 'yes' | 'shoulder' | 'no';
export interface ClimateMonth { month: number; airHigh: number; airLow: number; sea: number; swim: Swim; rain: 'low' | 'some' | 'high'; }

export const CLIMATE: ClimateMonth[] = [
  { month: 0,  airHigh: 16, airLow: 8,  sea: 17, swim: 'no',       rain: 'high' },
  { month: 1,  airHigh: 17, airLow: 8,  sea: 17, swim: 'no',       rain: 'high' },
  { month: 2,  airHigh: 19, airLow: 10, sea: 18, swim: 'no',       rain: 'some' },
  { month: 3,  airHigh: 22, airLow: 12, sea: 18, swim: 'shoulder', rain: 'some' },
  { month: 4,  airHigh: 26, airLow: 16, sea: 21, swim: 'yes',      rain: 'low'  },
  { month: 5,  airHigh: 30, airLow: 19, sea: 24, swim: 'yes',      rain: 'low'  },
  { month: 6,  airHigh: 33, airLow: 22, sea: 26, swim: 'yes',      rain: 'low'  },
  { month: 7,  airHigh: 33, airLow: 23, sea: 27, swim: 'yes',      rain: 'low'  },
  { month: 8,  airHigh: 31, airLow: 21, sea: 26, swim: 'yes',      rain: 'low'  },
  { month: 9,  airHigh: 27, airLow: 17, sea: 25, swim: 'yes',      rain: 'low'  },
  { month: 10, airHigh: 22, airLow: 14, sea: 22, swim: 'shoulder', rain: 'some' },
  { month: 11, airHigh: 18, airLow: 11, sea: 19, swim: 'no',       rain: 'high' },
];

// Sea-temperature range across the year, for scaling the mini-bars.
export const SEA_MIN = 16;
export const SEA_MAX = 28;
