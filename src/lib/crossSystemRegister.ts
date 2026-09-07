// Cross-system parallel customer onboarding — in the real app this calls the
// SupplyPro (Arbora-Pack) backend's public customer/register endpoint
// directly from the browser, after this system's own primary create/register
// call has already succeeded.
//
// DEMO BUILD: disabled outright. This is a public, unauthenticated demo
// site — a real network call here would write real customer records into
// the live production Arbora database. No-op, always report success so the
// calling UI flow doesn't dead-end.
export async function registerInOtherSystem(
  _payload: Record<string, any>,
): Promise<{ success: boolean; message: string }> {
  return { success: true, message: "Skipped in demo mode." };
}
