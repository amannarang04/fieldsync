import { responseRepository } from '../repositories/response.repository.js';
import { formRepository } from '../repositories/form.repository.js';

export function makeResponseFilter(input: { userId: string; isAdmin: boolean; formId?: unknown; workerId?: unknown; from?: unknown; to?: unknown; status?: unknown }) {
  const where: any = input.isAdmin ? {} : { workerId: input.userId };
  if (input.formId) where.formVersion = { formId: String(input.formId) };
  if (input.isAdmin && input.workerId) where.workerId = String(input.workerId);
  if (input.status) where.status = String(input.status);
  if (input.from || input.to) where.collectedAt = { ...(input.from ? { gte: new Date(String(input.from)) } : {}), ...(input.to ? { lt: upperDate(String(input.to)) } : {}) };
  return where;
}
function upperDate(value: string) { const date = new Date(value); if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date.setUTCDate(date.getUTCDate() + 1); return date; }
export async function listResponses(where: any, page: number) { const take = 50; const [items, total] = await responseRepository.list(where, page, take); return { items, total, page, pages: Math.ceil(total / take) }; }
export async function exportFormResponses(formId: string, filter: any) {
  const versions = await formRepository.listVersionsForExport(formId, filter);
  if (!versions.length) return null;
  const headers = ['response_id', 'worker', 'version', 'collected_at', ...Array.from(new Set(versions.flatMap(version => (version.fields as any[]).map(field => field.label))))];
  const rows: unknown[][] = [headers];
  for (const version of versions) for (const response of version.responses) {
    const fields = version.fields as any[];
    rows.push([response.clientId, response.worker.name, String(version.version), response.collectedAt.toISOString(), ...headers.slice(4).map(label => {
      const field = fields.find(item => item.label === label);
      const value = field ? (response.answers as any)[field.id] : '';
      return Array.isArray(value) ? value.join('; ') : String(value ?? '');
    })]);
  }
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  return csv;
}
