import { SubmissionSchema, validateAnswers } from '@fieldsync/shared';
import { formRepository } from '../repositories/form.repository.js';
import { responseRepository } from '../repositories/response.repository.js';
import type { Principal } from './security.service.js';

export async function syncSubmissions(user: Principal, submissions: unknown[]) {
  const results = [];
  for (const raw of submissions as any[]) {
    const parsed = SubmissionSchema.safeParse(raw);
    if (!parsed.success) { results.push({ clientId: raw?.clientId, status: 'REJECTED', reasons: ['Invalid submission format'] }); continue; }
    const submission = parsed.data;
    try {
      if (await responseRepository.findByClientId(submission.clientId)) { results.push({ clientId: submission.clientId, status: 'DUPLICATE' }); continue; }
      const version = await formRepository.getVersion(submission.formVersionId);
      if (!version) { results.push({ clientId: submission.clientId, status: 'REJECTED', reasons: ['Form version not found'] }); continue; }
      if (user.role !== 'ADMIN' && !await formRepository.isAssigned(version.formId, user.id)) { results.push({ clientId: submission.clientId, status: 'REJECTED', reasons: ['This form is no longer assigned to you'] }); continue; }
      const reasons = validateAnswers(version.fields as any[], submission.answers);
      if (reasons.length) { results.push({ clientId: submission.clientId, status: 'REJECTED', reasons }); continue; }
      try {
        await responseRepository.create({ clientId: submission.clientId, formVersionId: submission.formVersionId, workerId: user.id, answers: submission.answers as any, collectedAt: new Date(submission.collectedAt), lat: submission.lat ?? null, lng: submission.lng ?? null, status: 'ACCEPTED' });
        results.push({ clientId: submission.clientId, status: 'ACCEPTED' });
      } catch (error: any) {
        if (error.code === 'P2002') results.push({ clientId: submission.clientId, status: 'DUPLICATE' });
        else throw error;
      }
    } catch (error) {
      console.error(error);
      results.push({ clientId: submission.clientId, status: 'FAILED', reasons: ['Temporary server error'] });
    }
  }
  return results;
}
