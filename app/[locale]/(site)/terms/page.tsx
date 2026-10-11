// Legal page — content in lib/legal (typed, 7 locales).
import { legalMetadata, legalPage } from '@/components/legal/legalPage';

export const generateMetadata = legalMetadata('terms');
export default legalPage('terms');
