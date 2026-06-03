import type { Lang, LocationType } from '@/lib/types';

export const LANGS: { code: Lang; label: string; dir: 'ltr' | 'rtl' }[] = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'es', label: 'Español', dir: 'ltr' },
];

type Dict = Record<Lang, string>;

export const t: Record<string, Dict> = {
  appName: {
    en: 'Atlan Metro Green Book',
    ar: 'دليل أتلان مترو الأخضر',
    es: 'Guía Verde de Atlan Metro',
  },
  tagline: {
    en: 'Muslim-friendly places across Metro Atlanta',
    ar: 'أماكن صديقة للمسلمين في أنحاء مترو أتلانتا',
    es: 'Lugares amigables para musulmanes en Metro Atlanta',
  },
  map: { en: 'Map', ar: 'الخريطة', es: 'Mapa' },
  list: { en: 'List', ar: 'القائمة', es: 'Lista' },
  filters: { en: 'Filters', ar: 'عوامل التصفية', es: 'Filtros' },
  all: { en: 'All', ar: 'الكل', es: 'Todos' },
  halal: { en: 'Halal', ar: 'حلال', es: 'Halal' },
  alcohol_free: { en: 'Alcohol-free', ar: 'خالٍ من الكحول', es: 'Sin alcohol' },
  prayer_space: { en: 'Prayer space', ar: 'مصلى', es: 'Sala de oración' },
  family_friendly: { en: 'Family-friendly', ar: 'مناسب للعائلات', es: 'Familiar' },
  directions: { en: 'Get directions', ar: 'الاتجاهات', es: 'Cómo llegar' },
  call: { en: 'Call', ar: 'اتصال', es: 'Llamar' },
  hours: { en: 'Hours', ar: 'ساعات العمل', es: 'Horario' },
  results: { en: 'places', ar: 'مكان', es: 'lugares' },
  search: { en: 'Search places…', ar: 'ابحث عن أماكن…', es: 'Buscar lugares…' },
  noResults: { en: 'No places match your filters.', ar: 'لا توجد أماكن مطابقة.', es: 'No hay lugares que coincidan.' },
  offer: { en: 'Offer', ar: 'عرض', es: 'Oferta' },
  close: { en: 'Close', ar: 'إغلاق', es: 'Cerrar' },
  prayerTimes: { en: 'Prayer Times', ar: 'مواقيت الصلاة', es: 'Horarios de oración' },
  fajr: { en: 'Fajr', ar: 'الفجر', es: 'Fajr' },
  sunrise: { en: 'Sunrise', ar: 'الشروق', es: 'Amanecer' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر', es: 'Dhuhr' },
  asr: { en: 'Asr', ar: 'العصر', es: 'Asr' },
  maghrib: { en: 'Maghrib', ar: 'المغرب', es: 'Maghrib' },
  isha: { en: 'Isha', ar: 'العشاء', es: 'Isha' },
  nextPrayer: { en: 'Next', ar: 'القادمة', es: 'Próximo' },
  qibla: { en: 'Qibla', ar: 'القبلة', es: 'Qibla' },
  qiblaDirection: { en: 'Qibla Direction', ar: 'اتجاه القبلة', es: 'Dirección de la Qibla' },
  locating: { en: 'Getting location…', ar: 'جارٍ تحديد الموقع…', es: 'Obteniendo ubicación…' },
  locationDenied: { en: 'Location unavailable (using Atlanta)', ar: 'الموقع غير متاح (يستخدم أتلانتا)', es: 'Ubicación no disponible (usando Atlanta)' },
  enableCompass: { en: 'Enable Compass', ar: 'تفعيل البوصلة', es: 'Habilitar brújula' },
  compassNotAvailable: { en: 'Compass not available on this device', ar: 'البوصلة غير متاحة على هذا الجهاز', es: 'Brújula no disponible en este dispositivo' },
  back: { en: 'Back', ar: 'رجوع', es: 'Volver' },
};

export const TYPE_LABELS: Record<LocationType, Dict> = {
  masjid: { en: 'Mosque', ar: 'مسجد', es: 'Mezquita' },
  restaurant: { en: 'Restaurant', ar: 'مطعم', es: 'Restaurante' },
  coffee: { en: 'Cafe', ar: 'مقهى', es: 'Café' },
  grocery: { en: 'Grocery', ar: 'بقالة', es: 'Tienda' },
  garments: { en: 'Clothing', ar: 'ملابس', es: 'Ropa' },
  park: { en: 'Park', ar: 'حديقة', es: 'Parque' },
  museum: { en: 'Museum', ar: 'متحف', es: 'Museo' },
  attraction: { en: 'Attraction', ar: 'معلم', es: 'Atracción' },
  mall: { en: 'Mall', ar: 'مركز تسوق', es: 'Centro comercial' },
  worldcup_venue: { en: 'World Cup', ar: 'كأس العالم', es: 'Mundial' },
};
