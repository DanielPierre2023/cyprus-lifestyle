// Page numbers and addresses of the paginated directory lists (lib/directory/paging.ts). Offline.
import { pageWindow, pageHref, parsePageNo } from '@/lib/directory/paging';
import { eq, report } from './_harness';

eq('one page → just 1', pageWindow(1, 1), [1]);
eq('few pages → all of them', pageWindow(2, 4), [1, 2, 3, 4]);
eq('first page of many', pageWindow(1, 280), [1, 2, 3, 0, 280]);
eq('middle of many: window plus both ends, gaps marked', pageWindow(50, 280), [1, 0, 48, 49, 50, 51, 52, 0, 280]);
eq('last page of many', pageWindow(280, 280), [1, 0, 278, 279, 280]);
eq('no gap marker when the window touches the ends', pageWindow(3, 6), [1, 2, 3, 4, 5, 6]);
eq('page 1 is the list itself', pageHref('/directory/vendor', 1), '/directory/vendor');
eq('page 3', pageHref('/directory/vendor', 3), '/directory/vendor/p/3');
eq('group list page', pageHref('/directory/g/health', 12), '/directory/g/health/p/12');
eq('a plain number parses', parsePageNo('7'), 7);
eq('four digits parse', parsePageNo('9999'), 9999);
eq('zero is not a page', parsePageNo('0'), 0);
eq('leading zero is not a page', parsePageNo('07'), 0);
eq('text is not a page', parsePageNo('abc'), 0);
eq('negative is not a page', parsePageNo('-2'), 0);
eq('five digits are refused', parsePageNo('10000'), 0);
eq('empty is not a page', parsePageNo(''), 0);

report('directory.paging');
