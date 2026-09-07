/**
 * Minimal layout for the public auth routes (login + signup).
 *
 * The (dashboard) layout owns the sidebar + PrivateRoute gate; everything
 * else under (auth) lives here. The login page owns its own full-viewport
 * background and centering — wrapping in a centred <main> here would
 * shrink it and clip its backdrop, so we deliberately render bare.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
