import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { FormDefinitionSchema } from '@fieldsync/shared';

const empty = z.union([z.undefined(), z.object({}).strict()]);
const idParams = z.object({ id: z.string().min(1) });
const register = z.object({ name: z.string().trim().min(1), email: z.string().trim().email(), password: z.string().min(8) });
const login = z.object({ email: z.string().trim().email(), password: z.string().min(1) });
const refresh = z.object({ refreshToken: z.string().min(1) });
const logout = z.object({ refreshToken: z.string().optional() });
const worker = z.object({ name: z.string().trim().min(1), email: z.string().trim().email(), password: z.string().min(8) });
const assignments = z.object({ workerIds: z.array(z.string().min(1)) });
const syncBatch = z.object({ submissions: z.array(z.unknown()).max(100) });
const responsesQuery = z.object({ formId: z.string().optional(), workerId: z.string().optional(), from: z.string().date().optional(), to: z.string().date().optional(), status: z.enum(['ACCEPTED','REJECTED']).optional(), page: z.coerce.number().int().positive().optional() }).passthrough();
const exportQuery = z.object({ formId: z.string().min(1), workerId: z.string().optional(), from: z.string().date().optional(), to: z.string().date().optional(), status: z.enum(['ACCEPTED','REJECTED']).optional() }).passthrough();
type Endpoint = { method: string; path: RegExp; body?: z.ZodTypeAny; query?: z.ZodTypeAny; params?: z.ZodTypeAny };
const endpoints: Endpoint[] = [
  { method: 'GET', path: /^\/api\/health$/, body: empty, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/auth\/register$/, body: register, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/auth\/login$/, body: login, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/auth\/refresh$/, body: refresh, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/auth\/logout$/, body: logout, query: z.object({}).passthrough() },
  { method: 'GET', path: /^\/api\/auth\/me$/, body: empty, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/admin\/workers$/, body: worker, query: z.object({}).passthrough() },
  { method: 'GET', path: /^\/api\/admin\/workers$/, body: empty, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/forms$/, body: FormDefinitionSchema, query: z.object({}).passthrough() },
  { method: 'GET', path: /^\/api\/forms$/, body: empty, query: z.object({}).passthrough() },
  { method: 'PUT', path: /^\/api\/forms\/[^/]+$/, params: idParams, body: FormDefinitionSchema, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/forms\/[^/]+\/assign$/, params: idParams, body: assignments, query: z.object({}).passthrough() },
  { method: 'PUT', path: /^\/api\/forms\/[^/]+\/assignments$/, params: idParams, body: assignments, query: z.object({}).passthrough() },
  { method: 'GET', path: /^\/api\/forms\/assigned$/, body: empty, query: z.object({}).passthrough() },
  { method: 'POST', path: /^\/api\/sync$/, body: syncBatch, query: z.object({}).passthrough() },
  { method: 'GET', path: /^\/api\/responses$/, body: empty, query: responsesQuery },
  { method: 'GET', path: /^\/api\/responses\/export\.csv$/, body: empty, query: exportQuery },
  { method: 'GET', path: /^\/api\/responses\/[^/]+$/, params: idParams, body: empty, query: z.object({}).passthrough() }
];

export function validateRequest(req: Request, res: Response, next: NextFunction) {
  const endpoint = endpoints.find(candidate => candidate.method === req.method && candidate.path.test(req.path));
  if (!endpoint) return next();
  for (const [key, schema, value] of [
    ['params', endpoint.params, endpoint.params ? { id: decodeURIComponent(req.path.match(/^\/api\/(?:forms|responses)\/([^/]+)/)?.[1] ?? '') } : req.params],
    ['query', endpoint.query, req.query],
    ['body', endpoint.body, req.body]
  ] as const) {
    if (!schema) continue;
    const parsed = schema.safeParse(value);
    if (!parsed.success) return res.status(400).json({ error: { message: `Invalid request ${key}`, details: parsed.error.flatten() } });
    if (key === 'body') req.body = parsed.data;
  }
  next();
}
