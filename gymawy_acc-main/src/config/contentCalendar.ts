// Fixed Select / Multi-select options for the Content Calendar, matching the
// original Notion setup (label + soft color). Colors are hex, rendered as a
// translucent tag that reads well on the dark theme.

export interface CalSelectOption {
  key: string;
  labelAr: string;
  color: string; // hex
}

// نوع المحتوى (single select) — Manual order preserved from Notion
export const CONTENT_TYPES: CalSelectOption[] = [
  { key: 'vlog', labelAr: 'فلوج', color: '#A16249' },        // بني
  { key: 'podcast', labelAr: 'بودكاست', color: '#F97316' },  // برتقالي
  { key: 'rest', labelAr: 'راحه', color: '#EAB308' },        // أصفر
  { key: 'post', labelAr: 'بوست', color: '#3B82F6' },        // أزرق
  { key: 'ad', labelAr: 'اعلان', color: '#22C55E' },         // أخضر
  { key: 'reel', labelAr: 'ريل', color: '#A855F7' },         // بنفسجي
  { key: 'long_video', labelAr: 'فيديو طويل', color: '#EC4899' }, // وردي
];

// الحساب (single select)
export const ACCOUNTS: CalSelectOption[] = [
  { key: 'gymawya', labelAr: 'جيماوية', color: '#3B82F6' },       // أزرق
  { key: 'gymbirch', labelAr: 'جيم بيرش', color: '#F97316' },     // برتقالي
  { key: 'gymawyz', labelAr: 'جيماويز', color: '#22C55E' },       // أخضر
  { key: 'youssef_ashraf', labelAr: 'يوسف اشرف', color: '#EC4899' }, // وردي
];

// المنصات (multi-select)
export const PLATFORMS: CalSelectOption[] = [
  { key: 'youtube', labelAr: 'يوتيوب', color: '#EF4444' },     // أحمر
  { key: 'tiktok', labelAr: 'تيك توك', color: '#1E40AF' },     // أزرق غامق
  { key: 'instagram', labelAr: 'انستجرام', color: '#A855F7' }, // بنفسجي
  { key: 'facebook', labelAr: 'فيس بوك', color: '#A16249' },   // بني
];

// Preset colors for the month page-icon square.
export const MONTH_ICON_COLORS = [
  '#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EC4899',
  '#EF4444', '#EAB308', '#14B8A6', '#6366F1', '#A16249',
];

export const findOption = (opts: CalSelectOption[], key?: string): CalSelectOption | undefined =>
  key ? opts.find((o) => o.key === key) : undefined;

export const optionLabel = (opts: CalSelectOption[], key?: string): string =>
  findOption(opts, key)?.labelAr || '';
