import express, { Express } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import config  from "config/env"
const {  UPLOAD_BASE_DIR } = config
import { corsOptions } from "utils/CorsOptions";
import { encryptionMiddleware } from "middlewares/encryption";
import { getPublicKeyPem } from "libs/encryption";
export const applyBaseSetup = (app: Express): void => {
  // Set view engine and trust proxy
  app.set('view engine', 'ejs');
  app.set('trust proxy', 1);

  // Apply compression middleware
  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));



  // Enable CORS with proper configuration
  app.use(cors(corsOptions as any));

  // Apply security headers with Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          imgSrc: ["'self'", "data:", "https:", "http:"],
          fontSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'self'"],
          connectSrc: ["'self'", "https:"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
      xssFilter: true,
    })
  );

  // Parse JSON and URL-encoded bodies with size limits
  app.use(express.json({
    limit: '10mb',
    strict: true,
    type: 'application/json'
  }));
  
  app.use(express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 1000
  }));

  // Decrypt encrypted request payloads / encrypt responses when the
  // client sends the `isencrypted` header (requires ENCRYPTION_ENABLED=true)
  app.use(encryptionMiddleware);

  // Public key the client uses to wrap its per-request AES session key
  if (config.ENCRYPTION_ENABLED) {
    app.get('/encryption/public-key', (_req, res) => {
      res.type('text/plain').send(getPublicKeyPem());
    });
  }

  // React demo of the encryption flow (same-origin → no CORS needed).
  // Serves the Vite build when available, otherwise the raw example dir.
  const demoDir = path.resolve(process.cwd(), 'examples/secure-frontend');
  const demoDist = path.join(demoDir, 'dist');
  const demoRoot = fs.existsSync(demoDist) ? demoDist : demoDir;
  if (fs.existsSync(demoRoot)) {
    app.use('/secure-demo', express.static(demoRoot));
  }

  // Serve static files with proper headers
  app.use('/uploads', express.static(UPLOAD_BASE_DIR as string, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  app.use('/public', express.static(UPLOAD_BASE_DIR as string, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
};
