import javascriptObfuscator from 'vite-plugin-javascript-obfuscator';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const devSecurityShield = () => ({
  name: 'dev-security-shield',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = (req.url || '').split('?')[0].toLowerCase();
      const blockedPatterns = [
        /^\/\.env/,
        /^\/\.git/,
        /^\/package(-lock)?\.json$/,
        /^\/vite\.config\./,
        /\.txt$/,
        /\.pem$/,
        /\.key$/
      ];

      if (blockedPatterns.some((rx) => rx.test(url))) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain');
        res.end('403 Forbidden - Protected by AKTUVault Security Shield');
        return;
      }

      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
      next();
    });
  }
});

export default defineConfig({
  plugins: [
    javascriptObfuscator({
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        selfDefending: false,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75
      }
    }),react(), devSecurityShield()],
  server: {
    host: 'localhost',
    port: 5173,
    fs: {
      deny: ['.env', '.env.*', '*.pem', '*.key', '.git/**', 'package.json', 'package-lock.json', 'vite.config.*', '*.txt']
    }
  },
  build: {
    sourcemap: false
  }
});