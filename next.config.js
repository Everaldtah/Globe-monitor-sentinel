/** @type {import('next').NextConfig} */
const nextConfig = {
 reactStrictMode: true,
 turbopack: {},
 images: {
 remotePatterns: [
 { protocol: 'https', hostname: 'images.unsplash.com' },
 { protocol: 'https', hostname: 'raw.githubusercontent.com' },
 { protocol: 'https', hostname: 'unpkg.com' },
 { protocol: 'https', hostname: '**.githubusercontent.com' },
 ],
 },
 webpack: (config, { isServer }) => {
 // Handle Three.js and WebGL in SSR
 if (!isServer) {
 config.resolve.fallback = {
 ...config.resolve.fallback,
 fs: false,
 path: false,
 };
 }
 return config;
 },
}

module.exports = nextConfig
