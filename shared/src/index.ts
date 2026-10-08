import { z } from 'zod';

export const FieldSchema = z.object({
  id: z.string().min(1), label: z.string().min(1), type: z.enum(['text','number','single_choice','multiple_choice','date','gps']),
  required: z.boolean().default(false), min: z.number().optional(), max: z.number().optional(), options: z.array(z.string()).optional(),
  condition: z.object({ fieldId: z.string(), equals: z.union([z.string(), z.number(), z.boolean()]) }).optional()
}).superRefine((field, ctx) => {
  if (field.type.includes('choice') && !field.options?.length) ctx.addIssue({code:'custom',message:'Choice fields require options',path:['options']});
  if (field.min !== undefined && field.max !== undefined && field.min > field.max) ctx.addIssue({code:'custom',message:'Minimum cannot exceed maximum',path:['min']});
});
export const FormDefinitionSchema = z.object({ title: z.string().min(1), description: z.string().optional(), fields: z.array(FieldSchema).min(1) });
export const SubmissionSchema = z.object({ clientId: z.string().uuid(), formVersionId: z.string().min(1), answers: z.record(z.unknown()), collectedAt: z.string().datetime(), lat: z.number().optional(), lng: z.number().optional() });
export type Field = z.infer<typeof FieldSchema>;
export type FormDefinition = z.infer<typeof FormDefinitionSchema>;

export function isFieldVisible(field: Field, answers: Record<string, unknown>): boolean {
  if (!field.condition) return true;
  return answers[field.condition.fieldId] === field.condition.equals;
}

export function validateAnswers(fields: Field[], answers: Record<string, unknown>) {
  const errors: string[] = [];
  for (const field of fields) {
    if (!isFieldVisible(field, answers)) continue;
    const value = answers[field.id];
    if ((value === undefined || value === null || value === '') && field.required) { errors.push(`${field.label} is required`); continue; }
    if (value === undefined || value === null || value === '') continue;
    if (field.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) errors.push(`${field.label} must be a number`);
      else { if (field.min !== undefined && value < field.min) errors.push(`${field.label} must be at least ${field.min}`); if (field.max !== undefined && value > field.max) errors.push(`${field.label} must be at most ${field.max}`); }
    }
    if (field.type === 'text' && typeof value !== 'string') errors.push(`${field.label} must be text`);
    if (field.type === 'single_choice' && (typeof value !== 'string' || !field.options?.includes(value))) errors.push(`${field.label} has an invalid choice`);
    if (field.type === 'multiple_choice' && (!Array.isArray(value) || value.some(v => typeof v !== 'string' || !field.options?.includes(v)))) errors.push(`${field.label} has invalid choices`);
    if (field.type === 'date' && (typeof value !== 'string' || Number.isNaN(Date.parse(value)))) errors.push(`${field.label} must be a valid date`);
    if (field.type === 'gps' && (typeof value !== 'object' || value === null || typeof (value as any).lat !== 'number' || typeof (value as any).lng !== 'number')) errors.push(`${field.label} must contain a GPS location`);
  }
  return errors;
}

export function retryDelay(attempt: number, baseMs = 1000, maxMs = 60000) { return Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt))); }
