import type { AuthRequest } from '../middleware/auth.js';
import type { Request, Response } from 'express';
import { formRepository } from '../repositories/form.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { publishForm, publishNextVersion, replaceFormAssignments } from '../services/form.service.js';

export async function createForm(req: Request, res: Response) { return res.status(201).json(await publishForm(req.body.title, req.body.fields)); }
export async function listForms(req: AuthRequest, res: Response) { return res.json(await formRepository.listForRole(req.user!.id, req.user!.role === 'ADMIN')); }
export async function updateForm(req: Request, res: Response) {
  const form = await publishNextVersion(String(req.params.id), req.body.title, req.body.fields);
  if (!form) return res.status(404).json({ error: { message: 'Form not found' } });
  return res.json(form);
}
export async function addAssignments(req: Request, res: Response) {
  const form = await formRepository.findById(String(req.params.id));
  if (!form) return res.status(404).json({ error: { message: 'Form not found' } });
  const workers = await userRepository.findWorkersByIds(req.body.workerIds);
  if (workers.length !== new Set(req.body.workerIds).size) return res.status(400).json({ error: { message: 'One or more worker IDs are invalid' } });
  await formRepository.addAssignments(form.id, req.body.workerIds);
  return res.json({ ok: true });
}
export async function updateAssignments(req: Request, res: Response) {
  const result = await replaceFormAssignments(String(req.params.id), req.body.workerIds);
  if (result.kind === 'missing') return res.status(404).json({ error: { message: 'Form not found' } });
  if (result.kind === 'invalid-workers') return res.status(400).json({ error: { message: 'One or more worker IDs are invalid' } });
  return res.json({ ok: true });
}
export async function assignedForms(req: AuthRequest, res: Response) { return res.json(await formRepository.listAssigned(req.user!.id, req.user!.role === 'ADMIN')); }
