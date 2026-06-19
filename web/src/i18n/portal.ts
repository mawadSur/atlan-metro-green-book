import type { Lang } from '@/lib/types';

type Dict = Record<Lang, string>;

// Strings for the business portal, navigation, and match-day section.
// Kept separate from strings.ts to avoid edit collisions during parallel build.
export const tp: Record<string, Dict> = {
  // Navigation
  nav_places: { en: 'Places', ar: 'الأماكن', es: 'Lugares' },
  nav_prayer: { en: 'Prayer', ar: 'الصلاة', es: 'Oración' },
  nav_worldcup: { en: 'Match Day', ar: 'يوم المباراة', es: 'Día de partido' },
  nav_portal: { en: 'Business', ar: 'الأعمال', es: 'Negocios' },
  back: { en: 'Back', ar: 'رجوع', es: 'Volver' },

  // Match day (summer 2026 matches at Mercedes-Benz Stadium)
  wc_title: { en: 'Summer 2026 Matches', ar: 'مباريات صيف ٢٠٢٦', es: 'Partidos verano 2026' },
  wc_subtitle: {
    // Honest framing: the stadium has no prayer room — we point to the nearest.
    en: 'Halal food + prayer near Mercedes-Benz Stadium, by match day',
    ar: 'طعام حلال وصلاة قرب ملعب مرسيدس-بنز، حسب يوم المباراة',
    es: 'Comida halal y oración cerca del Estadio Mercedes-Benz, por día de partido',
  },
  wc_explore: { en: 'Explore Green Zone', ar: 'استكشف المنطقة الخضراء', es: 'Explorar Zona Verde' },
  wc_match_plans: {
    en: 'Match-day plans',
    ar: 'خطط يوم المباراة',
    es: 'Planes del día del partido',
  },

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

  // Portal — sign up
  noAccount: { en: 'New business? Create an account', ar: 'عمل جديد؟ أنشئ حسابًا', es: '¿Negocio nuevo? Crea una cuenta' },
  signUpTitle: { en: 'Create your business account', ar: 'أنشئ حساب عملك', es: 'Crea tu cuenta de negocio' },
  signUpSubtitle: {
    en: 'Sign up to claim your listing and manage your discount offer.',
    ar: 'سجّل لتطلب إدارة قائمتك وعرض الخصم الخاص بك.',
    es: 'Regístrate para reclamar tu ficha y gestionar tu oferta.',
  },
  createAccount: { en: 'Create account', ar: 'إنشاء حساب', es: 'Crear cuenta' },
  creatingAccount: { en: 'Creating account…', ar: 'جارٍ إنشاء الحساب…', es: 'Creando cuenta…' },
  passwordHint: { en: 'At least 8 characters', ar: '٨ أحرف على الأقل', es: 'Al menos 8 caracteres' },
  signUpCheckEmail: {
    en: 'Almost there — we sent a confirmation link to your email. Open it to activate your account, then sign in.',
    ar: 'اقتربت — أرسلنا رابط تأكيد إلى بريدك. افتحه لتفعيل حسابك ثم سجّل الدخول.',
    es: 'Casi listo — enviamos un enlace de confirmación a tu correo. Ábrelo para activar tu cuenta y luego inicia sesión.',
  },
  signUpError: {
    en: 'Could not create the account. Check your email and use a password of at least 8 characters.',
    ar: 'تعذّر إنشاء الحساب. تحقق من بريدك واستخدم كلمة مرور من ٨ أحرف على الأقل.',
    es: 'No se pudo crear la cuenta. Revisa tu correo y usa una contraseña de al menos 8 caracteres.',
  },

  // Portal — password reset
  forgotPassword: { en: 'Forgot password?', ar: 'نسيت كلمة المرور؟', es: '¿Olvidaste tu contraseña?' },
  resetTitle: { en: 'Reset your password', ar: 'إعادة تعيين كلمة المرور', es: 'Restablecer contraseña' },
  resetSubtitle: {
    en: 'Enter your email and we will send you a reset link.',
    ar: 'أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين.',
    es: 'Ingresa tu correo y te enviaremos un enlace para restablecerla.',
  },
  sendResetLink: { en: 'Send reset link', ar: 'إرسال الرابط', es: 'Enviar enlace' },
  sendingResetLink: { en: 'Sending…', ar: 'جارٍ الإرسال…', es: 'Enviando…' },
  resetSent: {
    en: 'Check your inbox for a link to reset your password.',
    ar: 'تحقق من بريدك للحصول على رابط إعادة تعيين كلمة المرور.',
    es: 'Revisa tu correo para encontrar el enlace de restablecimiento.',
  },
  resetError: {
    en: 'Could not send the email. Try again.',
    ar: 'تعذّر إرسال البريد. حاول مجددًا.',
    es: 'No se pudo enviar el correo. Inténtalo de nuevo.',
  },
  backToSignIn: { en: 'Back to sign in', ar: 'العودة لتسجيل الدخول', es: 'Volver a iniciar sesión' },
  setNewPassword: { en: 'Set a new password', ar: 'تعيين كلمة مرور جديدة', es: 'Establecer nueva contraseña' },
  newPassword: { en: 'New password', ar: 'كلمة المرور الجديدة', es: 'Nueva contraseña' },
  updatePassword: { en: 'Update password', ar: 'تحديث كلمة المرور', es: 'Actualizar contraseña' },
  updatingPassword: { en: 'Updating…', ar: 'جارٍ التحديث…', es: 'Actualizando…' },
  passwordUpdated: { en: 'Password updated.', ar: 'تم تحديث كلمة المرور.', es: 'Contraseña actualizada.' },
  passwordUpdateError: {
    en: 'Could not update password. Try again.',
    ar: 'تعذّر تحديث كلمة المرور. حاول مجددًا.',
    es: 'No se pudo actualizar la contraseña. Inténtalo de nuevo.',
  },

  // Portal — self-claim
  claimTitle: { en: 'Claim your business', ar: 'سجّل عملك', es: 'Reclama tu negocio' },
  claimIntro: {
    en: 'Find your business below and request to manage its listing. An admin will review your request.',
    ar: 'ابحث عن عملك أدناه واطلب إدارة قائمته. سيقوم المسؤول بمراجعة طلبك.',
    es: 'Busca tu negocio abajo y solicita gestionar su ficha. Un administrador revisará tu solicitud.',
  },
  searchLocations: { en: 'Search locations', ar: 'ابحث عن المواقع', es: 'Buscar locales' },
  searchPlaceholder: { en: 'Type a business name…', ar: 'اكتب اسم العمل…', es: 'Escribe un nombre…' },
  searchTyping: { en: 'Keep typing to search…', ar: 'تابع الكتابة للبحث…', es: 'Sigue escribiendo para buscar…' },
  searching: { en: 'Searching…', ar: 'جارٍ البحث…', es: 'Buscando…' },
  noResults: { en: 'No locations match your search.', ar: 'لا توجد مواقع مطابقة لبحثك.', es: 'No hay locales que coincidan.' },
  claimNote: { en: 'Note for the admin (optional)', ar: 'ملاحظة للمسؤول (اختياري)', es: 'Nota para el administrador (opcional)' },
  claimNotePlaceholder: {
    en: 'e.g. I am the owner / manager',
    ar: 'مثال: أنا المالك / المدير',
    es: 'ej. soy el propietario / gerente',
  },
  selectedLocation: { en: 'Selected', ar: 'المحدد', es: 'Seleccionado' },
  changeSelection: { en: 'Change', ar: 'تغيير', es: 'Cambiar' },
  submitClaim: { en: 'Request to claim', ar: 'إرسال الطلب', es: 'Enviar solicitud' },
  submittingClaim: { en: 'Submitting…', ar: 'جارٍ الإرسال…', es: 'Enviando…' },
  claimSubmitted: {
    en: 'Request sent. An admin will review it soon.',
    ar: 'تم إرسال الطلب. سيراجعه المسؤول قريبًا.',
    es: 'Solicitud enviada. Un administrador la revisará pronto.',
  },
  claimError: {
    en: 'Could not submit your request. Try again.',
    ar: 'تعذّر إرسال طلبك. حاول مجددًا.',
    es: 'No se pudo enviar la solicitud. Inténtalo de nuevo.',
  },
  claimPendingTitle: { en: 'Claim pending approval', ar: 'الطلب قيد الموافقة', es: 'Solicitud pendiente' },
  claimPendingBody: {
    en: 'Your claim request is awaiting admin approval. You can edit your listing once it is approved.',
    ar: 'طلبك بانتظار موافقة المسؤول. يمكنك تعديل قائمتك بمجرد الموافقة عليه.',
    es: 'Tu solicitud está esperando la aprobación del administrador. Podrás editar tu ficha una vez aprobada.',
  },

  // Portal — full profile editor
  loadError: {
    en: 'Could not load your business. Check your connection and try again.',
    ar: 'تعذّر تحميل عملك. تحقق من اتصالك وحاول مجددًا.',
    es: 'No se pudo cargar tu negocio. Revisa tu conexión e inténtalo de nuevo.',
  },
  retry: { en: 'Retry', ar: 'إعادة المحاولة', es: 'Reintentar' },
  signOutError: { en: 'Could not sign out. Try again.', ar: 'تعذّر تسجيل الخروج. حاول مجددًا.', es: 'No se pudo cerrar sesión. Inténtalo de nuevo.' },
  sectionNames: { en: 'Business name', ar: 'اسم العمل', es: 'Nombre del negocio' },
  sectionContact: { en: 'Contact & hours', ar: 'التواصل والساعات', es: 'Contacto y horario' },
  sectionAmenities: { en: 'Amenities', ar: 'الميزات', es: 'Comodidades' },
  sectionOffer: { en: 'Discount offer', ar: 'عرض الخصم', es: 'Oferta de descuento' },
  nameEn: { en: 'Name (English)', ar: 'الاسم (الإنجليزية)', es: 'Nombre (inglés)' },
  nameAr: { en: 'Name (Arabic)', ar: 'الاسم (العربية)', es: 'Nombre (árabe)' },
  nameEs: { en: 'Name (Spanish)', ar: 'الاسم (الإسبانية)', es: 'Nombre (español)' },
  address: { en: 'Address', ar: 'العنوان', es: 'Dirección' },
  phone: { en: 'Phone', ar: 'الهاتف', es: 'Teléfono' },
  hoursEn: { en: 'Hours (English)', ar: 'الساعات (الإنجليزية)', es: 'Horario (inglés)' },
  hoursAr: { en: 'Hours (Arabic)', ar: 'الساعات (العربية)', es: 'Horario (árabe)' },
  hoursEs: { en: 'Hours (Spanish)', ar: 'الساعات (الإسبانية)', es: 'Horario (español)' },
  alcoholFree: { en: 'Alcohol-free', ar: 'خالٍ من الكحول', es: 'Sin alcohol' },
  prayerSpace: { en: 'Prayer space', ar: 'مصلى', es: 'Espacio de oración' },
  familyFriendly: { en: 'Family friendly', ar: 'مناسب للعائلات', es: 'Apto para familias' },
  worldcupSpecial: { en: 'Match-day special', ar: 'عرض يوم المباراة', es: 'Especial de día de partido' },
};

export const localeFor = (lang: Lang): string =>
  lang === 'ar' ? 'ar' : lang === 'es' ? 'es-ES' : 'en-US';
