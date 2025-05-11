/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rkiswxzdtxbaqfprzvet.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  eslint: {
    // We want to see ESLint errors during development but ignore the specific
    // 'src/types/supabase.ts' file during the build process if it causes issues.
    // Setting ignoreDuringBuilds: false makes sure ESLint runs during build.
    // ignorePatterns will exclude the specified file from linting.
    ignoreDuringBuilds: false,
    ignorePatterns: ['src/types/supabase.ts'],
  },
  // Other Next.js config options can go here
};

module.exports = nextConfig;
