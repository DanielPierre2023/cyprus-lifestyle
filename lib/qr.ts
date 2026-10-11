// lib/qr.ts — a small, dependency-free QR Code encoder (ISO/IEC 18004), byte mode, error-correction level M, versions 1-10
// (up to 213 bytes: enough for a verification URL). Pure: returns the module matrix, or an inline SVG string, so it can run
// on the server and ship no JavaScript to the browser. Verified in scripts/tests/qr.test.ts against its own decoder-free
// invariants (structure, Reed-Solomon, format/version bits); the release check also decodes the output with an independent
// QR reader (see docs/MEMBER-CARD.md).
//
// Layout of the algorithm: data bits -> codewords -> Reed-Solomon per block -> interleave -> place in the matrix -> choose
// the best of the 8 masks by the standard penalty rules -> write format information.

/** Level M: [EC codewords per block, [blocks, data codewords per block][]] for versions 1..10. */
const M_BLOCKS: Record<number, [number, [number, number][]]> = {
  1: [10, [[1, 16]]],
  2: [16, [[1, 28]]],
  3: [26, [[1, 44]]],
  4: [18, [[2, 32]]],
  5: [24, [[2, 43]]],
  6: [16, [[4, 27]]],
  7: [18, [[4, 31]]],
  8: [22, [[2, 38], [2, 39]]],
  9: [22, [[3, 36], [2, 37]]],
  10: [26, [[4, 43], [1, 44]]],
};
const ALIGN: Record<number, number[]> = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};
const REMAINDER_BITS: Record<number, number> = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };
export const QR_MAX_BYTES = 213;

const dataCapacity = (v: number) => M_BLOCKS[v][1].reduce((s, [n, d]) => s + n * d, 0);

// ── Reed-Solomon over GF(256), primitive polynomial 0x11D ────────────────────────────────────────────────────────
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const gmul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree: number): number[] {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) { next[j] ^= poly[j]; next[j + 1] ^= gmul(poly[j], EXP[i]); }
    poly = next;
  }
  return poly;                                   // leading coefficient 1 first
}
export function rsRemainder(data: number[], degree: number): number[] {
  const gen = rsGenerator(degree);
  const rem = new Array(degree).fill(0);
  for (const b of data) {
    const factor = b ^ rem[0];
    rem.shift(); rem.push(0);
    for (let i = 0; i < degree; i++) rem[i] ^= gmul(gen[i + 1], factor);
  }
  return rem;
}

const utf8 = (s: string): number[] => Array.from(new TextEncoder().encode(s));

/** The final codeword sequence (data + error correction, interleaved) for `bytes` at the smallest fitting version. */
export function buildCodewords(bytes: number[]): { version: number; codewords: number[] } {
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const need = 4 + (v < 10 ? 8 : 16) + 8 * bytes.length;
    if (need <= 8 * dataCapacity(v)) { version = v; break; }
  }
  if (!version) throw new Error(`QR: ${bytes.length} bytes do not fit (max ${QR_MAX_BYTES})`);

  const bits: number[] = [];
  const put = (val: number, len: number) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);                                 // byte mode
  put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  const cap = 8 * dataCapacity(version);
  for (let i = 0; i < 4 && bits.length < cap; i++) bits.push(0);   // terminator
  while (bits.length % 8) bits.push(0);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < dataCapacity(version); pad ^= 0xec ^ 0x11) data.push(pad);

  const [ecLen, groups] = M_BLOCKS[version];
  const dataBlocks: number[][] = [];
  let pos = 0;
  for (const [n, len] of groups) for (let i = 0; i < n; i++) { dataBlocks.push(data.slice(pos, pos + len)); pos += len; }
  const ecBlocks = dataBlocks.map((b) => rsRemainder(b, ecLen));
  const out: number[] = [];
  const maxLen = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < maxLen; i++) for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
  for (let i = 0; i < ecLen; i++) for (const b of ecBlocks) out.push(b[i]);
  return { version, codewords: out };
}

export type QrMatrix = boolean[][];

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

/** Encode text (UTF-8, byte mode, level M) into a square matrix: true = dark module. */
export function qrMatrix(text: string): QrMatrix {
  const { version, codewords } = buildCodewords(utf8(text));
  const size = 17 + 4 * version;
  const mod: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const setFn = (x: number, y: number, dark: boolean) => { mod[y][x] = dark; fn[y][x] = true; };

  // timing, finders (with separators), alignment, reserved format/version areas
  for (let i = 0; i < size; i++) { setFn(6, i, i % 2 === 0); setFn(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setFn(x, y, dist !== 2 && dist !== 4);
    }
  };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = ALIGN[version];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setFn(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const formatBits = (mask: number) => {
    const data = (0b00 << 3) | mask;                // level M = 00
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    return ((data << 10) | rem) ^ 0x5412;
  };
  const drawFormat = (mask: number) => {
    const bits = formatBits(mask);
    for (let i = 0; i <= 5; i++) setFn(8, i, bit(bits, i));
    setFn(8, 7, bit(bits, 6)); setFn(8, 8, bit(bits, 7)); setFn(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, bit(bits, i));
    setFn(8, size - 8, true);                       // the always-dark module
  };
  drawFormat(0);                                    // reserve (overwritten with the chosen mask below)
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      setFn(a, b, bit(bits, i)); setFn(b, a, bit(bits, i));
    }
  }

  // data placement: zig-zag from the bottom-right, two columns at a time, skipping the vertical timing column
  const stream: number[] = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) stream.push((cw >>> i) & 1);
  for (let i = 0; i < REMAINDER_BITS[version]; i++) stream.push(0);
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j;
      const upward = ((right + 1) & 2) === 0;
      const y = upward ? size - 1 - vert : vert;
      if (!fn[y][x] && k < stream.length) mod[y][x] = stream[k++] === 1;
    }
  }

  const MASKS: ((x: number, y: number) => boolean)[] = [
    (x, y) => (x + y) % 2 === 0, (_x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (m: number) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };

  let best = 0, bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    applyMask(m); drawFormat(m);
    const s = penalty(mod);
    if (s < bestScore) { bestScore = s; best = m; }
    applyMask(m);                                   // XOR again: undo
  }
  applyMask(best); drawFormat(best);
  return mod;
}

/** The standard four penalty rules (ISO 18004 §7.8.3). */
export function penalty(m: QrMatrix): number {
  const n = m.length;
  let score = 0;
  // rule 1: runs of 5+ same-coloured modules; rule 3: 1:1:3:1:1 finder-like patterns with a 4-module quiet side
  const line = (get: (i: number) => boolean) => {
    let run = 1;
    for (let i = 1; i < n; i++) {
      if (get(i) === get(i - 1)) { run++; if (run === 5) score += 3; else if (run > 5) score += 1; } else run = 1;
    }
    const s = Array.from({ length: n }, (_, i) => (get(i) ? 1 : 0)).join('');
    for (const pat of ['10111010000', '00001011101']) { let from = 0; for (;;) { const at = s.indexOf(pat, from); if (at < 0) break; score += 40; from = at + 1; } }
  };
  for (let y = 0; y < n; y++) line((i) => m[y][i]);
  for (let x = 0; x < n; x++) line((i) => m[i][x]);
  // rule 2: 2x2 blocks
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) score += 3;
  // rule 4: dark/light balance
  let dark = 0; for (const row of m) for (const c of row) if (c) dark++;
  const total = n * n;
  score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return score;
}

/** Inline SVG (one path, crisp edges, 4-module quiet zone). `px` = rendered width/height in CSS pixels. */
export function qrSvg(text: string, opts: { px?: number; dark?: string; light?: string; label?: string } = {}): string {
  const m = qrMatrix(text);
  const n = m.length, quiet = 4, dim = n + quiet * 2;
  const dark = opts.dark || '#000', light = opts.light || '#fff';
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!m[y][x]) { x++; continue; }
      let run = 1; while (x + run < n && m[y][x + run]) run++;
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`;
      x += run;
    }
  }
  const px = opts.px || 220;
  const label = (opts.label || 'QR code').replace(/[<>&"]/g, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${px}" height="${px}" role="img" aria-label="${label}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
}
