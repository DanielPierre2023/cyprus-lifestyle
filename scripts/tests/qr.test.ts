// The dependency-free QR encoder (lib/qr.ts): Reed-Solomon vector, structure, format information, determinism, SVG.
// The release check additionally decodes the output with an independent reader (jsQR) — see docs/MEMBER-CARD.md.
import { qrMatrix, qrSvg, rsRemainder, buildCodewords, penalty, QR_MAX_BYTES } from '@/lib/qr';
import { createHash } from 'node:crypto';
import { eq, ok, report } from './_harness';

// Reed-Solomon: the worked example in the QR specification tutorials (version 1-M, 9 data codewords shown with 17 EC codewords).
eq('RS remainder (known vector)', rsRemainder([32, 65, 205, 69, 41, 220, 46, 128, 236], 17), [42, 159, 74, 221, 244, 169, 239, 150, 138, 70, 237, 85, 224, 96, 74, 219, 61]);

// sizes: 17 + 4 x version, smallest version that fits (level M, byte mode)
const sizeFor = (n: number) => qrMatrix('a'.repeat(n)).length;
eq('version 1 up to 14 bytes, then version 2', [sizeFor(1), sizeFor(14), sizeFor(15)], [21, 21, 25]);
eq('version boundaries', [sizeFor(26), sizeFor(27), sizeFor(106), sizeFor(107), sizeFor(213)], [25, 29, 41, 45, 57]);
let threw = false; try { qrMatrix('a'.repeat(QR_MAX_BYTES + 1)); } catch { threw = true; }
ok('too long to encode -> throws, never a wrong code', threw);

// codeword counts equal the version's capacity (data + EC, interleaved)
eq('total codewords v1 / v5 / v10', [buildCodewords(new Array(5).fill(65)).codewords.length, buildCodewords(new Array(80).fill(65)).codewords.length, buildCodewords(new Array(200).fill(65)).codewords.length], [26, 134, 346]);

// structure of a real verification URL
const URL1 = 'https://cypruslifestyle.eu/ar/card/verify/' + 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v';
const m = qrMatrix(URL1);
const n = m.length;
const finderOk = (x0: number, y0: number) => { for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const edge = x === 0 || y === 0 || x === 6 || y === 6, core = x >= 2 && x <= 4 && y >= 2 && y <= 4; if (m[y0 + y][x0 + x] !== (edge || core)) return false; } return true; };
ok('three finder patterns', finderOk(0, 0) && finderOk(n - 7, 0) && finderOk(0, n - 7));
ok('timing patterns alternate', Array.from({ length: n - 16 }, (_, i) => m[6][8 + i] === ((8 + i) % 2 === 0)).every(Boolean) && Array.from({ length: n - 16 }, (_, i) => m[8 + i][6] === ((8 + i) % 2 === 0)).every(Boolean));
ok('the always-dark module', m[n - 8][8] === true);

// format information: both copies carry the same 15 valid bits (BCH(15,5) remainder zero after removing the 0x5412 mask)
const rd = (pts: [number, number][]) => pts.reduce((a, [x, y], i) => a | ((m[y][x] ? 1 : 0) << i), 0);
const copy1 = rd([[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]]);
const copy2 = rd([...Array.from({ length: 8 }, (_, i) => [n - 1 - i, 8] as [number, number]), ...Array.from({ length: 7 }, (_, i) => [8, n - 7 + i] as [number, number])]);
const bch = (v: number) => { let r = v; for (let i = 14; i >= 10; i--) if ((r >> i) & 1) r ^= 0x537 << (i - 10); return r; };
ok('format bits (copy 1) are a valid codeword for level M', bch(copy1 ^ 0x5412) === 0 && ((copy1 ^ 0x5412) >> 13) === 0);
ok('format bits (copy 2) equal copy 1', copy2 === copy1);

// determinism, penalty sanity and the SVG
eq('same input -> identical matrix', JSON.stringify(qrMatrix(URL1)) === JSON.stringify(m), true);
ok('different input -> different matrix', JSON.stringify(qrMatrix(URL1 + 'x')) !== JSON.stringify(m));
ok('penalty is a finite non-negative number', Number.isFinite(penalty(m)) && penalty(m) >= 0);
const svg = qrSvg(URL1, { px: 200, label: 'a "<b>" code' });
ok('svg: one path, viewBox with a 4-module quiet zone, escaped label', svg.startsWith('<svg') && svg.includes(`viewBox="0 0 ${n + 8} ${n + 8}"`) && (svg.match(/<path/g) || []).length === 1 && !svg.includes('<b>') && svg.includes('role="img"'));
// regression snapshot (the encoding was verified against jsQR for all lengths 1-213 when this test was written)
eq('snapshot of the verified encoding', createHash('sha256').update(svg).digest('hex').slice(0, 16), 'b3a1bc880ced66a8');

report('qr');
