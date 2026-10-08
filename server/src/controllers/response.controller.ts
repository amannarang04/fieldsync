import type { AuthRequest } from '../middleware/auth.js';
import type { Response } from 'express';
import { responseRepository } from '../repositories/response.repository.js';
import { exportFormResponses, listResponses, makeResponseFilter } from '../services/response.service.js';

export async function list(req: AuthRequest, res: Response) {
  const query = req.query;
  const where = makeResponseFilter({ userId: req.user!.id, isAdmin: req.user!.role === 'ADMIN', formId: query.formId, workerId: query.workerId, from: query.from, to: query.to, status: query.status });
  return res.json(await listResponses(where, Math.max(1, Number(query.page ?? 1))));
}
export async function exportCsv(req: AuthRequest, res: Response) {
  const query = req.query;
  const where = makeResponseFilter({ userId: req.user!.id, isAdmin: true, workerId: query.workerId, from: query.from, to: query.to, status: query.status });
  const csv = await exportFormResponses(String(query.formId), where);
  if (csv === null) return res.status(404).json({ error: { message: 'Form not found' } });
  return res.type('text/csv').attachment('fieldsync-responses.csv').send(csv);
}
export async function byId(req: AuthRequest, res: Response) {
  const response = await responseRepository.findVisible(String(req.params.id), req.user!.id, req.user!.role === 'ADMIN');
  if (!response) return res.status(404).json({ error: { message: 'Response not found' } });
  return res.json(response);
}
