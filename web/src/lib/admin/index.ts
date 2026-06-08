// Barrel for the SERVER-ONLY admin action surface.
//
// Re-exports the Server Actions (defined with module-level 'use server' in their
// source files) so consumers can import from a single path:
//
//   import { listLocations, approveClaim, createUser } from '@/lib/admin';
//
// The directive lives on the source modules, not here; this file only forwards
// the already-marked actions. It does NOT export serviceClient/guard/audit/
// validate — those are internal server utilities (server-only) and must never be
// reachable from a client component.

// Location actions
export {
  listLocations,
  editLocation,
  verifyHalal,
  unverifyHalal,
} from './locations';
export type { ListLocationsOptions, LocationPatch } from './locations';

// Claim moderation actions
export { listClaims, approveClaim, rejectClaim } from './claims';

// User management actions
export {
  listUsers,
  createUser,
  setUserRole,
  disableUser,
  deleteUser,
} from './users';
export type { AdminUserView } from './users';
