/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'r2.klforge.in',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-877712caba8544e39ecfeee23adcee20.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-6d49c8bed9a74670be47f74c46e5792e.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  async redirects() {
    return [
      {
        source: '/certifications/verify/:certId*',
        destination: '/certification/verify/:certId*',
        permanent: true,
      },
    ];
  },
}

export default nextConfig;
