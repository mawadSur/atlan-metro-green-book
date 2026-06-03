import type { Lang } from '@/lib/types';

type Dict = Record<Lang, string>;

// Strings for the business portal, navigation, and World Cup section.
// Kept separate from strings.ts to avoid edit collisions during parallel build.
export const tp: Record<string, Dict> = {
  // Navigation
  nav_places: { en: 'Places', ar: 'الأماكن', es: 'Lugares' },
  nav_prayer: { en: 'Prayer', ar: 'الصلاة', es: 'Oración' },
  nav_worldcup: { en: 'World Cup', ar: 'كأس العالم', es: 'Mundial' },
  nav_portal: { en: 'Business', ar: 'الأعمال', es: 'Negocios' },
  back: { en: 'Back', ar: 'رجوع', es: 'Volver' },

  // World Cup
  wc_title: { en: 'FIFA World Cup 2026', ar: 'كأس العالم ٢٠٢٦', es: 'Copa Mundial 2026' },
  wc_subtitle: {
    en: 'Prayer rooms, wudu & halal food at the stadium',
    ar: 'غرف الصلاة والوضوء والطعام الحلال في الملعب',
    es: 'Salas de oración, wudu y comida halal en el estadio',
  },
  wc_explore: { en: 'Explore Green Zone', ar: 'استكشف المنطقة الخضراء', es: 'Explorar Zona Verde' },

  // Portal — auth
  portal_title: { en: 'Business Portal', ar: 'بوابة الأعمال', es: 'Portal de Negocios' },
  portal_subtitle: {
    en: 'Sign in to manage your discount offer',
    ar: 'سجّل الدخول لإدارة عرض الخصم الخاص بك',
    es: 'Inicia sesión para gestionar tu oferta',
  },
  email: { en: 'Email', ar: 'البريد الإلكتروني', es: 'Correo' },
  password: { en: 'Password', ar: 'كلمة المرور', es: 'Contraseña' },
  signIn: { en: 'Sign in', ar: 'تسجيل الدخول', es: 'Iniciar sesión' },
  signOut: { en: 'Sign out', ar: 'تسجيل الخروج', es: 'Cerrar sesión' },
  signingIn: { en: 'Signing in…', ar: 'جارٍ تسجيل الدخول…', es: 'Iniciando…' },
  showPassword: { en: 'Show password', ar: 'إظهار كلمة المرور', es: 'Mostrar contraseña' },
  hidePassword: { en: 'Hide password', ar: 'إخفاء كلمة المرور', es: 'Ocultar contraseña' },

  // Portal — editor
  yourLocation: { en: 'Your location', ar: 'موقعك', es: 'Tu ubicación' },
  noClaim: {
    en: 'No location is linked to your account yet. Contact the Green Book team to claim your business.',
    ar: 'لا يوجد موقع مرتبط بحسابك بعد. تواصل مع فريق الدليل الأخضر لتسجيل عملك.',
    es: 'Aún no hay un local vinculado a tu cuenta. Contacta al equipo de Green Book.',
  },
  discountCode: { en: 'Discount code', ar: 'رمز الخصم', es: 'Código de descuento' },
  offerEn: { en: 'Offer (English)', ar: 'العرض (الإنجليزية)', es: 'Oferta (inglés)' },
  offerAr: { en: 'Offer (Arabic)', ar: 'العرض (العربية)', es: 'Oferta (árabe)' },
  offerEs: { en: 'Offer (Spanish)', ar: 'العرض (الإسبانية)', es: 'Oferta (español)' },
  imageUrl: { en: 'Photo URL', ar: 'رابط الصورة', es: 'URL de foto' },
  save: { en: 'Save changes', ar: 'حفظ التغييرات', es: 'Guardar cambios' },
  saving: { en: 'Saving…', ar: 'جارٍ الحفظ…', es: 'Guardando…' },
  saved: { en: 'Saved', ar: 'تم الحفظ', es: 'Guardado' },
  saveError: { en: 'Could not save. Try again.', ar: 'تعذّر الحفظ. حاول مجددًا.', es: 'No se pudo guardar.' },
  authError: { en: 'Wrong email or password.', ar: 'بريد إلكتروني أو كلمة مرور خاطئة.', es: 'Correo o contraseña incorrectos.' },
};

export const localeFor = (lang: Lang): string =>
  lang === 'ar' ? 'ar' : lang === 'es' ? 'es-ES' : 'en-US';
