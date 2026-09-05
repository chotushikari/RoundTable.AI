import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['keren-uncircuitous-irreparably.ngrok-free.dev'],
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
