// Match-page + email + share strings.
//
// NO directive. Same shape as web/src/i18n/strings.ts: Record<string, {en,ar,es}>.
// Arabic is written for a Gulf/Arab World Cup audience — natural and idiomatic,
// not a literal word-for-word translation.

import type { Lang } from '@/lib/types';

type Dict = Record<Lang, string>;

export const m: Record<string, Dict> = {
  // --- Verdict templates -----------------------------------------------------
  // Use {place} / {stadium} / {n} placeholders; callers do simple replacement.
  verdict_halal_at_gate: {
    en: 'Halal at the gate: {place} is right by the stadium.',
    ar: 'حلال عند البوابة: {place} على بُعد خطوات من الملعب.',
    es: 'Halal en la puerta: {place} está junto al estadio.',
  },
  verdict_walkable: {
    en: '{n} halal & prayer spots within walking distance of {stadium}.',
    ar: '{n} من أماكن الحلال والصلاة على مسافة مشي من {stadium}.',
    es: '{n} sitios halal y de oración a poca distancia a pie de {stadium}.',
  },
  verdict_none_at_gate: {
    en: 'No halal at the gate — but you have a plan.',
    ar: 'لا يوجد حلال عند البوابة — لكن لديك خطة جاهزة.',
    es: 'No hay halal en la puerta, pero tienes un plan.',
  },
  verdict_plan_ready: {
    en: 'Your match-day halal & prayer plan is ready.',
    ar: 'خطتك ليوم المباراة من الحلال والصلاة جاهزة.',
    es: 'Tu plan halal y de oración para el día del partido está listo.',
  },

  // --- Prayer planner --------------------------------------------------------
  prayer_planner_title: {
    en: 'Prayer plan for match day',
    ar: 'خطة الصلاة ليوم المباراة',
    es: 'Plan de oración para el día del partido',
  },
  prayer_planner_before: {
    en: 'Pray {prayer} before kickoff at the nearest space below.',
    ar: 'صلِّ {prayer} قبل انطلاق المباراة في أقرب مصلى أدناه.',
    es: 'Reza {prayer} antes del inicio en el espacio más cercano abajo.',
  },
  prayer_planner_after: {
    en: 'Catch {prayer} after the final whistle on your way out.',
    ar: 'أدِّ صلاة {prayer} بعد صافرة النهاية في طريق عودتك.',
    es: 'Reza {prayer} tras el pitido final de camino a la salida.',
  },
  nearestPrayer: {
    en: 'Nearest prayer',
    ar: 'أقرب مصلى',
    es: 'Oración más cercana',
  },
  no_prayer_room_stadium: {
    en: 'No prayer room inside the stadium — plan ahead.',
    ar: 'لا يوجد مصلى داخل الملعب — رتّب أمرك مسبقاً.',
    es: 'No hay sala de oración dentro del estadio — planifica con antelación.',
  },

  // --- Email capture ---------------------------------------------------------
  email_cta: {
    en: 'Get the daily match-day halal + prayer guide',
    ar: 'احصل على دليل الحلال والصلاة اليومي ليوم المباراة',
    es: 'Recibe la guía diaria halal y de oración del día del partido',
  },
  email_placeholder: {
    en: 'you@email.com',
    ar: 'بريدك@الإلكتروني.com',
    es: 'tu@correo.com',
  },
  email_audience_local: {
    en: "I live here",
    ar: 'أنا مقيم هنا',
    es: 'Vivo aquí',
  },
  email_audience_visitor: {
    en: "I'm visiting for the World Cup",
    ar: 'أنا زائر لحضور كأس العالم',
    es: 'Estoy de visita por el Mundial',
  },
  email_consent: {
    en: 'We store your email only to send you the match-day halal + prayer guide. No spam — unsubscribe anytime via the link in every email.',
    ar: 'نحفظ بريدك الإلكتروني فقط لإرسال دليل الحلال والصلاة ليوم المباراة. بدون رسائل مزعجة — يمكنك إلغاء الاشتراك في أي وقت عبر الرابط في كل رسالة.',
    es: 'Guardamos tu correo solo para enviarte la guía halal y de oración del día del partido. Sin spam — cancela tu suscripción cuando quieras desde el enlace de cada correo.',
  },
  email_success: {
    en: "You're in ✓",
    ar: 'تم تسجيلك ✓',
    es: 'Estás dentro ✓',
  },
  email_error_invalid: {
    en: 'Please enter a valid email.',
    ar: 'يرجى إدخال بريد إلكتروني صحيح.',
    es: 'Introduce un correo válido.',
  },
  email_error_ratelimited: {
    en: 'Too many tries — please wait a bit and try again.',
    ar: 'محاولات كثيرة — انتظر قليلاً ثم حاول مرة أخرى.',
    es: 'Demasiados intentos — espera un poco e inténtalo de nuevo.',
  },
  email_error_generic: {
    en: "Something went wrong. Please try again.",
    ar: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    es: 'Algo salió mal. Inténtalo de nuevo.',
  },

  // --- Save / share ----------------------------------------------------------
  save: { en: 'Save', ar: 'حفظ', es: 'Guardar' },
  saved: { en: 'Saved', ar: 'محفوظ', es: 'Guardado' },
  share: { en: 'Share', ar: 'مشاركة', es: 'Compartir' },
  share_plan: {
    en: 'Share my plan',
    ar: 'شارك خطتي',
    es: 'Compartir mi plan',
  },
  seeAllAtlanta: {
    en: 'See all Atlanta halal',
    ar: 'شاهد كل أماكن الحلال في أتلانتا',
    es: 'Ver todo el halal de Atlanta',
  },

  // --- Travel modes ----------------------------------------------------------
  not_walkable: {
    en: 'not walkable',
    ar: 'بعيد عن المشي',
    es: 'no se puede ir a pie',
  },
  via_marta: {
    en: 'via MARTA',
    ar: 'عبر مترو مارتا',
    es: 'en MARTA',
  },
  rideshare: {
    en: 'rideshare',
    ar: 'سيارة أجرة / تطبيق توصيل',
    es: 'viaje compartido',
  },
};
