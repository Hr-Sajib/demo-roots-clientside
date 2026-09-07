// Cross-system parallel customer onboarding — calls the SupplyPro (Arbora-Pack)
// backend's public customer/register endpoint directly from the browser. Only
// ever called AFTER this system's own primary create/register call has already
// succeeded. See NEXT_PUBLIC_CROSS_SYSTEM_URL in .env.
export async function registerInOtherSystem(
  payload: Record<string, any>,
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_CROSS_SYSTEM_URL}/customer/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return {
        success: false,
        message: data?.message || "Failed to create the account in the other system.",
      };
    }
    return { success: true, message: data?.message || "Created successfully." };
  } catch {
    return { success: false, message: "Could not reach the other system." };
  }
}
