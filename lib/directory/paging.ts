// Page numbers and addresses for the paginated directory lists (pure, unit-tested). Page 1 is the list's own address; page N is "<base>/p/<N>".

/** Page numbers to show: first, last and a window around the current page; a gap between them is marked 0. */
export function pageWindow(page: number, pages: number): number[] {
  const want = new Set<number>([1, pages, page - 2, page - 1, page, page + 1, page + 2]);
  const nums = [...want].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: number[] = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push(0); out.push(n); });
  return out;
}

export const pageHref = (base: string, n: number): string => (n <= 1 ? base : `${base}/p/${n}`);

/** The page number in "/p/<n>", or 0 when it is not a plain positive integer (up to 9999). */
export const parsePageNo = (raw: string): number => (/^[1-9]\d{0,3}$/.test(String(raw)) ? Number(raw) : 0);
