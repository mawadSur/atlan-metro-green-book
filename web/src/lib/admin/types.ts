/**
 * Admin-only types for user management.
 * These types map to the 'profiles' table and auth.users.
 */

export type Role = 'user' | 'business' | 'admin';

export interface Profile {
  id: string;
  email: string;
  role: Role;
}

export interface AdminUser {
  id: string;
  email: string;
  role: Role;
  disabled: boolean;
  created_at: string;
}
