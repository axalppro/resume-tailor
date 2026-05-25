/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace packages are pure-TS sources; let Next compile them.
  transpilePackages: [
    "@resume-tailor/shared-types",
    "@resume-tailor/prompts",
    "@resume-tailor/resume-schema",
  ],
  experimental: {
    // Allow API routes that return large base64 PDFs.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
