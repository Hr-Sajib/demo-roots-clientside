import type { NextConfig } from "next";

// `remotePatterns` replaces the older `domains` whitelist. Earlier this file
// had `hostname: "**"` which is equivalent to "any HTTPS host" — fine for
// development but bad hygiene for production because next/image proxies
// every host it is allowed to see. Tightening to the actual S3 bucket
// where avatars / product images live is the safe default.
//
// If a future contributor needs to host images on a new domain, they
// should add that hostname here explicitly rather than re-opening the
// wildcard.
//
// References:
//   - app/(dashboardLayout)/page.tsx                       (user avatar fallback)
//   - app/(dashboardLayout)/user-management/page.tsx       (user images)
//   - components/user/UserDetailsModal.tsx                 (dummy placeholder)
//   - Features/Inventory/ProductDetailsModal.tsx           (No_Image_Available)
//
// imgbb.com is only used for *upload* via fetch() — it is never consumed
// via <Image>, so it does not belong here.
//
// rootsbeyond-bucket is the actual bucket RootsBeyond's own product/user
// uploads live in (separate from arbora-bucket, which is only the shared
// fallback/placeholder assets referenced above).
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "arbora-bucket.s3.us-east-2.amazonaws.com",
        pathname: "/**",
        port: "",
      },
      {
        protocol: "https",
        hostname: "rootsbeyond-bucket.s3.us-east-1.amazonaws.com",
        pathname: "/**",
        port: "",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
