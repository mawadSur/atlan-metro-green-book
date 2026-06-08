'use server';

// Server Action: on-demand revalidation of the World Cup match pages.
//
// WHY: the owner save in the portal is a CLIENT-side supabase.update. Time-based
// ISR alone keeps serving a stale offer until the next request *after* the
// revalidate window expires. revalidatePath can only run on the server, so this
// tiny Server Action is imported into the (client) LocationEditor and awaited
// after a successful save to push the fresh offer to /match/[slug] immediately.
//
// /match/[slug] is a dynamic route, so we use the route-pattern + type:'page'
// form per the Next 16 docs (revalidatePath.md): this invalidates every matching
// match page (all four slugs, and any added later) in a single call. Per the
// docs, `type` is REQUIRED when the path contains a dynamic segment.

import { revalidatePath } from 'next/cache';

export async function revalidateMatchPages(): Promise<void> {
  // Never throw into the caller's success UI — revalidation is best-effort.
  try {
    revalidatePath('/match/[slug]', 'page');
  } catch {
    // Swallow: a failed revalidation must not surface as a save error.
    // The page will still refresh on its next time-based ISR cycle.
  }
}
