import config from 'config/env';

// Allowed origins come from CORS_ORIGIN (comma-separated) in the active .env file
const allowedOrigins = config.CORS_ORIGIN;

// CORS configuration
const corsOptions = {
  origin: (origin: string, callback: Function) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error('Not allowed by CORS')); // Block the request
    }
  },
  credentials: config.CORS_CREDENTIALS, // Allow credentials (cookies, authorization headers, etc.)

  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'companyid', 'isencrypted', 'x-ek'], // Allowed headers
};

export { corsOptions }
