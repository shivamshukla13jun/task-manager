import config from 'config/env';

// Allowed origins come from CORS_ORIGIN (comma-separated) in the active .env file
const allowedOrigins = config.CORS_ORIGIN;

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};

// The origin this app itself is served from — allows same-site requests
// when the backend also hosts the frontend build.
const selfHost = hostOf(config.BASE_URL as string);

// CORS configuration
const corsOptions = {
  origin: (origin: string, callback: Function) => {
    const isSelf = selfHost !== null && hostOf(origin) === selfHost;
    if (!origin || isSelf || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')); // Block the request
    }
  },
  credentials: config.CORS_CREDENTIALS, // Allow credentials (cookies, authorization headers, etc.)

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'companyid', 'isencrypted', 'x-ek'], // Allowed headers
};

export { corsOptions }
