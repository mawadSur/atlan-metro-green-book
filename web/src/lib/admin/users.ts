'use server';
// SERVER-ONLY admin user-management actions (D1: full user mgmt + create users).
//
// These wrap Supabase auth.admin.* operations, which REQUIRE the service-role
// key — hence this surface is server-only and audited. Module-level 'use server'
// lets lane A's client components import them; all exports are async (Next 16).
// Every action re-verifies admin server-side and audits the mutation.

import { createServiceClient } from './serviceClient';
import { requireAdmin } from './guard';
import { writeAudit } from './audit';
import {
  assertUuid,
  assertEmail,
  assertRole,
  assertNonEmptyString,
} from './validate';
import type { Role } from '../types';

export interface AdminUserView {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
  /** True if the auth account is currently banned/disabled (soft-disable). */
  disabled: boolean;
}

// Far-future ban window used as a "soft disable" (Supabase has no boolean flag;
// a long ban_duration is the supported mechanism). ~100 years.
const SOFT_DISABLE_DURATION = `${100 * 365 * 24}h`;

/**
 * List users by joining the profiles table (role source of truth) with the auth
 * admin user list (for ban/disabled state). Returns one row per profile.
 */
export async function listUsers(accessToken: string): Promise<AdminUserView[]> {
  await requireAdmin(accessToken);
  const service = createServiceClient();

  const { data: profiles, error: profErr } = await service
    .from('profiles')
    .select('id, email, role, created_at')
    .order('created_at', { ascending: false });
  if (profErr) throw new Error(`[admin] listUsers (profiles) failed: ${profErr.message}`);

  // Pull auth users to discover banned/disabled state. First page (default size)
  // covers the expected admin scale; extend with pagination if user count grows.
  const { data: authData, error: authErr } = await service.auth.admin.listUsers();
  if (authErr) throw new Error(`[admin] listUsers (auth) failed: ${authErr.message}`);

  const bannedUntil = new Map<string, string | null>();
  for (const u of authData?.users ?? []) {
    // banned_until is present on the admin user record when a ban is active.
    const until = (u as unknown as { banned_until?: string | null }).banned_until ?? null;
    bannedUntil.set(u.id, until);
  }

  const now = Date.now();
  return (profiles ?? []).map((p) => {
    const until = bannedUntil.get(p.id) ?? null;
    const disabled = !!until && new Date(until).getTime() > now;
    return {
      id: p.id,
      email: p.email,
      role: p.role as Role,
      created_at: p.created_at,
      disabled,
    };
  });
}

/**
 * Create a new auth user (email confirmed) and set their profile role.
 * The profiles row is auto-created by the on_auth_user_created trigger; we then
 * set the requested role (defaults are 'user' otherwise).
 */
export async function createUser(
  accessToken: string,
  email: string,
  password: string,
  role: Role
): Promise<AdminUserView> {
  const { uid: adminUid } = await requireAdmin(accessToken);
  const cleanEmail = assertEmail(email);
  const cleanPassword = assertNonEmptyString(password, 'password');
  const cleanRole = assertRole(role);

  const service = createServiceClient();
  const { data: created, error: createErr } = await service.auth.admin.createUser({
    email: cleanEmail,
    password: cleanPassword,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    throw new Error(`[admin] createUser failed: ${createErr?.message ?? 'unknown error'}`);
  }
  const newUid = created.user.id;

  // The handle_new_user trigger inserts a profile (role 'user'); upsert the
  // requested role + email to be robust even if the trigger is disabled.
  const { error: profErr } = await service
    .from('profiles')
    .upsert(
      { id: newUid, email: cleanEmail, role: cleanRole },
      { onConflict: 'id' }
    );
  if (profErr) throw new Error(`[admin] createUser (profile) failed: ${profErr.message}`);

  await writeAudit(service, {
    actorUid: adminUid,
    action: 'user.create',
    targetType: 'user',
    targetId: newUid,
    detail: { email: cleanEmail, role: cleanRole },
  });

  return {
    id: newUid,
    email: cleanEmail,
    role: cleanRole,
    created_at: created.user.created_at ?? new Date().toISOString(),
    disabled: false,
  };
}

/** Change a user's role (the role column is service-role-only to write). */
export async function setUserRole(
  accessToken: string,
  uid: string,
  role: Role
): Promise<void> {
  const { uid: adminUid } = await requireAdmin(accessToken);
  const targetUid = assertUuid(uid, 'user id');
  const cleanRole = assertRole(role);
  const service = createServiceClient();

  const { error } = await service
    .from('profiles')
    .update({ role: cleanRole })
    .eq('id', targetUid);
  if (error) throw new Error(`[admin] setUserRole failed: ${error.message}`);

  await writeAudit(service, {
    actorUid: adminUid,
    action: 'user.set_role',
    targetType: 'user',
    targetId: targetUid,
    detail: { role: cleanRole },
  });
}

/**
 * Soft-disable a user by applying a long auth ban (preferred over deletion).
 * The account is preserved; the user can no longer sign in until re-enabled.
 */
export async function disableUser(
  accessToken: string,
  uid: string
): Promise<void> {
  const { uid: adminUid } = await requireAdmin(accessToken);
  const targetUid = assertUuid(uid, 'user id');
  const service = createServiceClient();

  const { error } = await service.auth.admin.updateUserById(targetUid, {
    ban_duration: SOFT_DISABLE_DURATION,
  });
  if (error) throw new Error(`[admin] disableUser failed: ${error.message}`);

  await writeAudit(service, {
    actorUid: adminUid,
    action: 'user.disable',
    targetType: 'user',
    targetId: targetUid,
    detail: { ban_duration: SOFT_DISABLE_DURATION },
  });
}

/**
 * Hard-delete a user from auth (irreversible). The profiles/businesses rows
 * cascade via ON DELETE CASCADE. Prefer disableUser unless deletion is intended.
 */
export async function deleteUser(
  accessToken: string,
  uid: string
): Promise<void> {
  const { uid: adminUid } = await requireAdmin(accessToken);
  const targetUid = assertUuid(uid, 'user id');
  const service = createServiceClient();

  const { error } = await service.auth.admin.deleteUser(targetUid);
  if (error) throw new Error(`[admin] deleteUser failed: ${error.message}`);

  await writeAudit(service, {
    actorUid: adminUid,
    action: 'user.delete',
    targetType: 'user',
    targetId: targetUid,
  });
}
