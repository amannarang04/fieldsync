import { formRepository } from '../repositories/form.repository.js';
import { userRepository } from '../repositories/user.repository.js';

export async function publishForm(title: string, fields: unknown) { return formRepository.create(title, fields); }
export async function publishNextVersion(id: string, title: string, fields: unknown) {
  const existing = await formRepository.findWithLatest(id);
  if (!existing) return null;
  return formRepository.updateWithVersion(id, title, fields, (existing.versions[0]?.version ?? 0) + 1);
}
export async function replaceFormAssignments(id: string, workerIds: string[]) {
  const form = await formRepository.findById(id);
  if (!form) return { kind: 'missing' as const };
  const workers = await userRepository.findWorkersByIds(workerIds);
  if (workers.length !== new Set(workerIds).size) return { kind: 'invalid-workers' as const };
  await formRepository.replaceAssignments(form.id, workerIds);
  return { kind: 'ok' as const };
}
