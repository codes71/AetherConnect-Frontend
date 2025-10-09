/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
  },
  outputFileTracingRoot: '/home/codes/Projects/AetherConnect2/AetherConnect-Frontend',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Enable source maps in development mode
      config.devtool = false;
    }
    // Add a rule to ignore specific warnings from dependencies.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      // Ignore the "require.extensions" warning from handlebars
      {
        module: /handlebars\/lib\/index\.js$/,
        message: /require\.extensions is not supported/,
      },
      // Ignore the "Critical dependency" warning from require-in-the-middle
      {
        module: /require-in-the-middle\/index\.js$/,
        message: /Critical dependency: require function is used/,
      },
      // Ignore the "Critical dependency" warning from express
      {
        module: /express\/lib\/view\.js$/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    // Important: return the modified config
    return config;
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    return [

      {
        source: '/api/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || '',
    NEXT_PUBLIC_WSS_URL: process.env.NEXT_PUBLIC_WSS_URL || 'ws://localhost:3000', // Connect to API Gateway
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: false,

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
