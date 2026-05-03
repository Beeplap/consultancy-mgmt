import type { NextConfig } from "next";

function supabaseStorageRemotePatterns(): NonNullable<
  NonNullable<NextConfig["images"]>["remotePatterns"]
> {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return [];
  try {
    const u = new URL(raw);
    if (!u.hostname) return [];
    const protocol = u.protocol === "http:" ? "http" : "https";
    return [
      {
        protocol,
        hostname: u.hostname,
        ...(u.port ? { port: u.port } : {}),
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: supabaseStorageRemotePatterns(),
  },
};

export default nextConfig;
