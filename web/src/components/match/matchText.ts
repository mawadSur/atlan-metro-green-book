// Supplemental match-page strings owned by the match islands.
//
// These complement (do NOT replace) the shared @/i18n/match dictionary `m`,
// which this agent must not edit. Anything here is match-page-local: spot
// caveats, prayer-trust labels, header/section copy, and the verdict +
// empty-state framing. Arabic is written idiomatically for a World Cup
// Gulf/Arab audience, not word-for-word.

import type { Lang } from '@/lib/types';

type Dict = Record<Lang, string>;

export const sp: Record<string, Dict> = {
  // --- Header / sections -----------------------------------------------------
  at_stadium: {
    en: 'Mercedes-Benz Stadium',
    ar: 'ملعب مرسيدس-بنز',
    es: 'Estadio Mercedes-Benz',
  },
  kickoff: { en: 'Kickoff', ar: 'انطلاق المباراة', es: 'Inicio' },
  walkable_title: {
    en: 'Walkable from the gate',
    ar: 'على مسافة مشي من البوابة',
    es: 'A pie desde la puerta',
  },
  triptier_title: {
    en: 'A short ride away',
    ar: 'على مسافة قصيرة بالسيارة',
    es: 'A poca distancia en coche',
  },
  directions: { en: 'Directions', ar: 'الاتجاهات', es: 'Cómo llegar' },

  // --- Transit / provenance --------------------------------------------------
  not_walkable: { en: 'not walkable', ar: 'بعيد عن المشي', es: 'no a pie' },
  community_listed: {
    en: 'Community-listed',
    ar: 'مُدرج من المجتمع',
    es: 'Listado comunitario',
  },
  serves_alcohol: {
    en: 'Serves alcohol',
    ar: 'يقدّم الكحول',
    es: 'Sirve alcohol',
  },
  vegan_no_cert: {
    en: 'Vegan — no halal cert needed',
    ar: 'نباتي — لا يحتاج شهادة حلال',
    es: 'Vegano — sin certificado halal',
  },
  offer_valid_today: {
    en: 'Offer valid today',
    ar: 'العرض ساري اليوم',
    es: 'Oferta válida hoy',
  },

  // --- Prayer types (D7) -----------------------------------------------------
  prayer_masjid: { en: 'Masjid', ar: 'مسجد', es: 'Mezquita' },
  prayer_musalla: { en: 'Musalla', ar: 'مصلى', es: 'Musalla' },
  prayer_quiet: { en: 'Quiet space', ar: 'مكان هادئ', es: 'Espacio tranquilo' },

  // --- Verdict ---------------------------------------------------------------
  verdict_food_and_prayer: {
    en: '{food} halal spot(s) + {prayer} prayer space within walking distance.',
    ar: '{food} مكان حلال + {prayer} مصلّى على مسافة مشي.',
    es: '{food} sitio(s) halal + {prayer} espacio de oración a pie.',
  },
  verdict_nearest_food: {
    en: 'Nearest food: {transit}.',
    ar: 'أقرب طعام: {transit}.',
    es: 'Comida más cercana: {transit}.',
  },
  verdict_heres_plan: {
    en: "Here's your match-day plan.",
    ar: 'إليك خطة يوم المباراة.',
    es: 'Aquí tienes tu plan para el día del partido.',
  },

  // --- Prayer planner --------------------------------------------------------
  prayer_answer_before: {
    en: '{prayer} is at {time} — pray before kickoff or right after the final whistle.',
    ar: '{prayer} في تمام {time} — صلِّها قبل انطلاق المباراة أو بعد صافرة النهاية مباشرة.',
    es: '{prayer} es a las {time} — reza antes del inicio o justo tras el pitido final.',
  },
  prayer_nearest_line: {
    en: 'Nearest prayer: {place}, {transit}.',
    ar: 'أقرب مصلى: {place}، {transit}.',
    es: 'Oración más cercana: {place}, {transit}.',
  },

  // --- Empty state (D3) ------------------------------------------------------
  empty_pre_title: {
    en: 'Before the match',
    ar: 'قبل المباراة',
    es: 'Antes del partido',
  },
  empty_pre_body: {
    en: 'Eat at a halal stop on your MARTA route in, then head to the gate.',
    ar: 'تناول الطعام في محطة حلال على طريق مترو مارتا، ثم توجّه إلى البوابة.',
    es: 'Come en una parada halal en tu ruta de MARTA y luego ve a la puerta.',
  },
  empty_at_title: {
    en: 'At the stadium',
    ar: 'في الملعب',
    es: 'En el estadio',
  },
  empty_at_body: {
    en: 'No prayer room inside — your nearest prayer space and an honest note on concessions:',
    ar: 'لا يوجد مصلى بالداخل — إليك أقرب مصلى وملاحظة صادقة عن أكشاك الطعام:',
    es: 'No hay sala de oración dentro — tu espacio más cercano y una nota honesta sobre los puestos:',
  },
  empty_concessions: {
    en: 'Stadium concessions are not halal-certified — plan to eat before or after.',
    ar: 'أكشاك الملعب غير معتمدة حلال — خطّط لتناول الطعام قبل المباراة أو بعدها.',
    es: 'Los puestos del estadio no tienen certificación halal — planea comer antes o después.',
  },

  // --- Share text ------------------------------------------------------------
  share_text: {
    en: 'My halal + prayer plan for {match} at Mercedes-Benz Stadium',
    ar: 'خطتي للحلال والصلاة لمباراة {match} في ملعب مرسيدس-بنز',
    es: 'Mi plan halal y de oración para {match} en el Estadio Mercedes-Benz',
  },
};

/** Replace {token} placeholders in a template with the provided values. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}
