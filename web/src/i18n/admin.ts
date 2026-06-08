import type { Lang } from '@/lib/types';

type Dict = Record<Lang, string>;

// Strings for the admin dashboard: locations, halal verification, claims, and users.
// Kept separate from portal.ts and strings.ts to avoid edit collisions during parallel build.
export const ta: Record<string, Dict> = {
  // Shell & access
  admin_title: { en: 'Admin Dashboard', ar: 'لوحة الإدارة', es: 'Panel de Administración' },
  access_denied: {
    en: 'Access denied. This area is for administrators only.',
    ar: 'تم رفض الوصول. هذه المنطقة مخصّصة للمسؤولين فقط.',
    es: 'Acceso denegado. Esta área es solo para administradores.',
  },

  // Navigation
  nav_locations: { en: 'Locations', ar: 'المواقع', es: 'Ubicaciones' },
  nav_claims: { en: 'Claims', ar: 'المطالبات', es: 'Reclamaciones' },
  nav_users: { en: 'Users', ar: 'المستخدمون', es: 'Usuarios' },

  // Generic actions
  search: { en: 'Search', ar: 'بحث', es: 'Buscar' },
  edit: { en: 'Edit', ar: 'تعديل', es: 'Editar' },
  save: { en: 'Save', ar: 'حفظ', es: 'Guardar' },
  saving: { en: 'Saving…', ar: 'جارٍ الحفظ…', es: 'Guardando…' },
  saved: { en: 'Saved', ar: 'تم الحفظ', es: 'Guardado' },
  cancel: { en: 'Cancel', ar: 'إلغاء', es: 'Cancelar' },

  // Generic states
  loading: { en: 'Loading…', ar: 'جارٍ التحميل…', es: 'Cargando…' },
  error: { en: 'Something went wrong.', ar: 'حدث خطأ ما.', es: 'Algo salió mal.' },
  retry: { en: 'Retry', ar: 'إعادة المحاولة', es: 'Reintentar' },

  // Halal verification flow
  verify_halal: { en: 'Verify halal status', ar: 'التحقق من حالة الحلال', es: 'Verificar estado halal' },
  verified_by_label: { en: 'Verified by', ar: 'تم التحقق بواسطة', es: 'Verificado por' },
  mark_verified: { en: 'Mark as verified', ar: 'وضع علامة كموثّق', es: 'Marcar como verificado' },
  unverify: { en: 'Remove verification', ar: 'إزالة التحقق', es: 'Quitar verificación' },
  halal_verified: { en: 'Halal verified', ar: 'حلال موثّق', es: 'Halal verificado' },
  halal_community: { en: 'Community listed', ar: 'مُدرج من المجتمع', es: 'Listado por la comunidad' },
  halal_unverified: { en: 'Unverified', ar: 'غير موثّق', es: 'No verificado' },

  // Claims queue
  claims_queue: { en: 'Claim requests', ar: 'طلبات المطالبة', es: 'Solicitudes de reclamación' },
  claim_pending: { en: 'Pending', ar: 'قيد الانتظار', es: 'Pendiente' },
  approve: { en: 'Approve', ar: 'موافقة', es: 'Aprobar' },
  reject: { en: 'Reject', ar: 'رفض', es: 'Rechazar' },
  reject_reason: { en: 'Reason for rejection', ar: 'سبب الرفض', es: 'Motivo del rechazo' },
  claim_approved: { en: 'Claim approved', ar: 'تمت الموافقة على المطالبة', es: 'Reclamación aprobada' },
  claim_rejected: { en: 'Claim rejected', ar: 'تم رفض المطالبة', es: 'Reclamación rechazada' },
  no_claims: { en: 'No claim requests yet.', ar: 'لا توجد طلبات مطالبة بعد.', es: 'Aún no hay solicitudes de reclamación.' },

  // Users
  users_title: { en: 'User management', ar: 'إدارة المستخدمين', es: 'Gestión de usuarios' },
  create_user: { en: 'Create user', ar: 'إنشاء مستخدم', es: 'Crear usuario' },
  email: { en: 'Email', ar: 'البريد الإلكتروني', es: 'Correo' },
  password: { en: 'Password', ar: 'كلمة المرور', es: 'Contraseña' },
  role: { en: 'Role', ar: 'الدور', es: 'Rol' },
  disable_user: { en: 'Disable user', ar: 'تعطيل المستخدم', es: 'Desactivar usuario' },
  delete_user: { en: 'Delete user', ar: 'حذف المستخدم', es: 'Eliminar usuario' },
  confirm_delete: {
    en: 'Are you sure you want to delete this user? This cannot be undone.',
    ar: 'هل أنت متأكد أنك تريد حذف هذا المستخدم؟ لا يمكن التراجع عن هذا.',
    es: '¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer.',
  },
  user_created: { en: 'User created', ar: 'تم إنشاء المستخدم', es: 'Usuario creado' },
  no_users: { en: 'No users found.', ar: 'لم يتم العثور على مستخدمين.', es: 'No se encontraron usuarios.' },
};
