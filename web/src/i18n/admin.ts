import type { Lang } from '@/lib/types';

type Dict = Record<Lang, string>;

// Strings for the admin portal
export const ta: Record<string, Dict> = {
  // Navigation
  back: { en: 'Back', ar: 'رجوع', es: 'Volver' },
  adminTitle: { en: 'Admin Portal', ar: 'بوابة الإدارة', es: 'Portal de Administración' },
  marketingAssets: {
    en: 'Marketing / QR codes',
    ar: 'مواد التسويق / رموز QR',
    es: 'Marketing / Códigos QR'
  },

  // Auth
  email: { en: 'Email', ar: 'البريد الإلكتروني', es: 'Correo' },
  password: { en: 'Password', ar: 'كلمة المرور', es: 'Contraseña' },
  signIn: { en: 'Sign in', ar: 'تسجيل الدخول', es: 'Iniciar sesión' },
  signOut: { en: 'Sign out', ar: 'تسجيل الخروج', es: 'Cerrar sesión' },
  signingIn: { en: 'Signing in…', ar: 'جارٍ تسجيل الدخول…', es: 'Iniciando…' },
  showPassword: { en: 'Show password', ar: 'إظهار كلمة المرور', es: 'Mostrar contraseña' },
  hidePassword: { en: 'Hide password', ar: 'إخفاء كلمة المرور', es: 'Ocultar contraseña' },
  notAuthorized: {
    en: 'Not authorized. Admin access required.',
    ar: 'غير مصرح. مطلوب وصول المسؤول.',
    es: 'No autorizado. Se requiere acceso de administrador.'
  },
  authError: {
    en: 'Wrong email or password.',
    ar: 'بريد إلكتروني أو كلمة مرور خاطئة.',
    es: 'Correo o contraseña incorrectos.'
  },

  // Tabs
  tabLocations: { en: 'Locations', ar: 'المواقع', es: 'Ubicaciones' },
  tabClaims: { en: 'Claims', ar: 'المطالبات', es: 'Reclamos' },
  tabUsers: { en: 'Users', ar: 'المستخدمون', es: 'Usuarios' },

  // Locations Admin
  locationsTitle: { en: 'Manage Locations', ar: 'إدارة المواقع', es: 'Gestionar Ubicaciones' },
  loading: { en: 'Loading…', ar: 'جارٍ التحميل…', es: 'Cargando…' },
  search: { en: 'Search', ar: 'بحث', es: 'Buscar' },
  halalStatus: { en: 'Halal Status', ar: 'حالة الحلال', es: 'Estado Halal' },
  verified: { en: 'Verified', ar: 'موثق', es: 'Verificado' },
  communityListed: { en: 'Community Listed', ar: 'مدرج من المجتمع', es: 'Listado Comunitario' },
  unverified: { en: 'Unverified', ar: 'غير موثق', es: 'No Verificado' },
  verifiedBy: { en: 'Verified By', ar: 'موثق من قبل', es: 'Verificado Por' },
  verifiedAt: { en: 'Verified At', ar: 'وقت التوثيق', es: 'Verificado En' },
  nameEn: { en: 'Name (English)', ar: 'الاسم (الإنجليزية)', es: 'Nombre (inglés)' },
  nameAr: { en: 'Name (Arabic)', ar: 'الاسم (العربية)', es: 'Nombre (árabe)' },
  nameEs: { en: 'Name (Spanish)', ar: 'الاسم (الإسبانية)', es: 'Nombre (español)' },
  address: { en: 'Address', ar: 'العنوان', es: 'Dirección' },
  phone: { en: 'Phone', ar: 'الهاتف', es: 'Teléfono' },
  hours: { en: 'Hours', ar: 'ساعات العمل', es: 'Horario' },
  save: { en: 'Save', ar: 'حفظ', es: 'Guardar' },
  saving: { en: 'Saving…', ar: 'جارٍ الحفظ…', es: 'Guardando…' },
  saved: { en: 'Saved', ar: 'تم الحفظ', es: 'Guardado' },
  saveError: { en: 'Could not save', ar: 'تعذّر الحفظ', es: 'No se pudo guardar' },
  markAsVerified: { en: 'Mark as Verified', ar: 'تعليم كموثق', es: 'Marcar como Verificado' },
  cancel: { en: 'Cancel', ar: 'إلغاء', es: 'Cancelar' },

  // Claims Admin
  claimsTitle: { en: 'Claim Requests', ar: 'طلبات المطالبة', es: 'Solicitudes de Reclamo' },
  noClaims: { en: 'No pending claims', ar: 'لا توجد مطالبات معلقة', es: 'No hay reclamos pendientes' },
  claimsPending: { en: 'Pending', ar: 'قيد الانتظار', es: 'Pendiente' },
  claimsApproved: { en: 'Approved', ar: 'موافق عليه', es: 'Aprobado' },
  claimsRejected: { en: 'Rejected', ar: 'مرفوض', es: 'Rechazado' },
  approve: { en: 'Approve', ar: 'موافقة', es: 'Aprobar' },
  reject: { en: 'Reject', ar: 'رفض', es: 'Rechazar' },
  requester: { en: 'Requester', ar: 'مقدم الطلب', es: 'Solicitante' },
  location: { en: 'Location', ar: 'الموقع', es: 'Ubicación' },
  note: { en: 'Note', ar: 'ملاحظة', es: 'Nota' },
  createdAt: { en: 'Created', ar: 'تم الإنشاء', es: 'Creado' },

  // Users Admin
  usersTitle: { en: 'User Management', ar: 'إدارة المستخدمين', es: 'Gestión de Usuarios' },
  createUser: { en: 'Create User', ar: 'إنشاء مستخدم', es: 'Crear Usuario' },
  role: { en: 'Role', ar: 'الدور', es: 'Rol' },
  roleUser: { en: 'User', ar: 'مستخدم', es: 'Usuario' },
  roleBusiness: { en: 'Business', ar: 'عمل', es: 'Negocio' },
  roleAdmin: { en: 'Admin', ar: 'مسؤول', es: 'Administrador' },
  disable: { en: 'Disable', ar: 'تعطيل', es: 'Deshabilitar' },
  enable: { en: 'Enable', ar: 'تفعيل', es: 'Habilitar' },
  delete: { en: 'Delete', ar: 'حذف', es: 'Eliminar' },
  changeEmail: { en: 'Change Email', ar: 'تغيير البريد الإلكتروني', es: 'Cambiar Correo' },
  confirmDelete: {
    en: 'Type the email to confirm deletion:',
    ar: 'اكتب البريد الإلكتروني لتأكيد الحذف:',
    es: 'Escribe el correo para confirmar eliminación:'
  },
  deleteConfirmMismatch: {
    en: 'Email does not match',
    ar: 'البريد الإلكتروني غير متطابق',
    es: 'El correo no coincide'
  },
  newEmail: { en: 'New Email', ar: 'البريد الجديد', es: 'Nuevo Correo' },
  newPassword: { en: 'New Password', ar: 'كلمة المرور الجديدة', es: 'Nueva Contraseña' },
  creating: { en: 'Creating…', ar: 'جارٍ الإنشاء…', es: 'Creando…' },
  created: { en: 'Created', ar: 'تم الإنشاء', es: 'Creado' },
  updating: { en: 'Updating…', ar: 'جارٍ التحديث…', es: 'Actualizando…' },
  updated: { en: 'Updated', ar: 'تم التحديث', es: 'Actualizado' },
  deleting: { en: 'Deleting…', ar: 'جارٍ الحذف…', es: 'Eliminando…' },
  deleted: { en: 'Deleted', ar: 'تم الحذف', es: 'Eliminado' },
  disabled: { en: 'Disabled', ar: 'معطل', es: 'Deshabilitado' },
  enabled: { en: 'Enabled', ar: 'مفعل', es: 'Habilitado' },
  errorOccurred: { en: 'An error occurred', ar: 'حدث خطأ', es: 'Ocurrió un error' },
};
