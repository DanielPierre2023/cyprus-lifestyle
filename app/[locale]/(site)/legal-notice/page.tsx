// Legal page — content in lib/legal (typed, 7 locales).
import { legalMetadata, legalPage } from '@/components/legal/legalPage';

export const generateMetadata = legalMetadata('notice');
export default legalPage('notice');
