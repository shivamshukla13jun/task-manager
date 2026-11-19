import { Express, Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { z } from 'zod';
import config from 'config/env';

interface RouteEntry {
  method: string;
  path: string;
  handlers: Function[];
  scopeRequiresAuth: boolean;
}

interface UploadMeta {
  kind: 'single' | 'array' | 'fields' | 'any';
  fields: string[];
}

/**
 * Express 4 represents a mounted router path as a RegExp whose source
 * looks like `^\/api\/users\/?(?=\/|$)`. Convert it back to `/api/users`.
 */
const mountPathFromRegexp = (regexp: RegExp): string => {
  let source = regexp.source;
  if (source.startsWith('^')) source = source.slice(1);
  const lookahead = source.indexOf('(?=');
  if (lookahead !== -1) source = source.slice(0, lookahead);
  source = source
    .replace(/\\\/\?$/, '')
    .replace(/\\\/$/, '')
    .replace(/\\\//g, '/')
    .replace(/\\\./g, '.')
    .replace(/\\/g, '');
  return source;
};

const collectRoutes = (
  stack: any[],
  prefix: string,
  scopeRequiresAuth: boolean,
  out: RouteEntry[]
): void => {
  for (const layer of stack) {
    if (layer.route) {
      const routePath = prefix + (layer.route.path === '/' ? '' : layer.route.path);
      const methods = Object.keys(layer.route.methods).filter(
        (m) => m !== '_all'
      );
      for (const method of methods) {
        out.push({
          method,
          path: routePath || '/',
          handlers: layer.route.stack
            .filter((s: any) => s.method === method)
            .map((s: any) => s.handle),
          scopeRequiresAuth,
        });
      }
    } else if (layer.name === 'router' && layer.handle?.stack) {
      collectRoutes(
        layer.handle.stack,
        prefix + mountPathFromRegexp(layer.regexp),
        scopeRequiresAuth,
        out
      );
    } else if (layer.handle && (layer.handle as any)._requiresAuth) {
      scopeRequiresAuth = true;
    }
  }
};

const zodToJsonSchema = (schema: z.ZodSchema): Record<string, any> => {
  try {
    return (z as any).toJSONSchema(schema, {
      io: 'input',
      unrepresentable: 'any',
    }) as Record<string, any>;
  } catch {
    return { type: 'object' };
  }
};

const toOpenApiPath = (path: string): { path: string; params: string[] } => {
  const params: string[] = [];
  const openApiPath = path.replace(/:([^/]+)/g, (_m, name) => {
    params.push(name);
    return `{${name}}`;
  });
  return { path: openApiPath, params };
};

const tagForPath = (path: string): string =>
  path.split('/').filter(Boolean)[1] || 'default';

const errorResponses = (requiresAuth: boolean): Record<string, any> => ({
  '400': { description: 'Validation error' },
  ...(requiresAuth ? { '401': { description: 'Unauthorized' } } : {}),
  '409': { description: 'Conflict (duplicate value)' },
  '500': { description: 'Internal server error' },
});

const buildRequestBody = (
  zodSchema: Record<string, any> | null,
  upload: UploadMeta | null
): Record<string, any> | undefined => {
  if (upload) {
    const properties: Record<string, any> = {
      ...(zodSchema?.properties || {}),
    };
    for (const field of upload.fields) {
      properties[field] =
        upload.kind === 'array'
          ? { type: 'array', items: { type: 'string', format: 'binary' } }
          : { type: 'string', format: 'binary' };
    }
    const schema: Record<string, any> = { type: 'object', properties };
    if (zodSchema?.required?.length) schema.required = zodSchema.required;
    return {
      required: true,
      content: { 'multipart/form-data': { schema } },
    };
  }

  if (zodSchema) {
    return {
      required: true,
      content: { 'application/json': { schema: zodSchema } },
    };
  }

  return undefined;
};

export const buildOpenApiSpec = (router: Router): Record<string, any> => {
  const routes: RouteEntry[] = [];
  collectRoutes((router as any).stack, '', false, routes);

  const paths: Record<string, any> = {};

  for (const route of routes) {
    const { path, params } = toOpenApiPath(route.path);
    const requiresAuth =
      route.scopeRequiresAuth ||
      route.handlers.some((h) => (h as any)._requiresAuth);
    const zodHandler = route.handlers.find((h) => (h as any)._zodSchema);
    const uploadHandler = route.handlers.find((h) => (h as any)._upload);

    const zodSchema = zodHandler
      ? zodToJsonSchema((zodHandler as any)._zodSchema)
      : null;
    const uploadMeta = uploadHandler
      ? ((uploadHandler as any)._upload as UploadMeta)
      : null;

    const operation: Record<string, any> = {
      operationId: `${route.method}_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      tags: [tagForPath(path)],
      ...(params.length
        ? {
            parameters: params.map((name) => ({
              name,
              in: 'path',
              required: true,
              schema: { type: 'string' },
            })),
          }
        : {}),
      ...(buildRequestBody(zodSchema, uploadMeta)
        ? { requestBody: buildRequestBody(zodSchema, uploadMeta) }
        : {}),
      ...(requiresAuth ? { security: [{ bearerAuth: [] }] } : {}),
      responses: {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: {},
                },
              },
            },
          },
        },
        ...errorResponses(requiresAuth),
      },
    };

    paths[path] = paths[path] || {};
    paths[path][route.method] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: config.SWAGGER_TITLE,
      version: '1.0.0',
    },
    servers: [{ url: config.BASE_URL }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    paths,
  };
};

/**
 * Auto-generates an OpenAPI spec by walking the registered Express
 * routers — no JSDoc comments needed. Served at /api-docs (UI) and
 * /api-docs.json (raw spec). Disabled via SWAGGER_ENABLED=false.
 */
export const setupSwagger = (app: Express, router: Router): void => {
  if (!config.SWAGGER_ENABLED) return;

  const spec = buildOpenApiSpec(router);
  app.get('/api-docs.json', (_req, res) => res.json(spec));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, { explorer: true }));
};
