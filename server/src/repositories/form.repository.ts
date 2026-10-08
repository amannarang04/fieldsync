import { prisma } from './prisma.js';

export const formRepository = {
  create(title: string, fields: unknown) { return prisma.form.create({ data: { title, versions: { create: { version: 1, title, fields: fields as any } } }, include: { versions: true } }); },
  listForRole(userId: string, isAdmin: boolean) { return prisma.form.findMany({ where: isAdmin ? {} : { assignments: { some: { workerId: userId } } }, include: { versions: { orderBy: { version: 'desc' } }, ...(isAdmin ? { assignments: { select: { workerId: true } } } : {}) } }); },
  findWithLatest(id: string) { return prisma.form.findUnique({ where: { id }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } }); },
  updateWithVersion(id: string, title: string, fields: unknown, version: number) { return prisma.form.update({ where: { id }, data: { title, versions: { create: { version, title, fields: fields as any } } }, include: { versions: { orderBy: { version: 'desc' }, take: 1 } } }); },
  findById(id: string) { return prisma.form.findUnique({ where: { id } }); },
  listAssigned(userId: string, isAdmin: boolean) { return prisma.form.findMany({ where: isAdmin ? {} : { assignments: { some: { workerId: userId } } }, include: { versions: { orderBy: { version: 'desc' } }, ...(isAdmin ? { assignments: { select: { workerId: true } } } : {}) } }); },
  replaceAssignments(formId: string, workerIds: string[]) { return prisma.$transaction([prisma.formAssignment.deleteMany({ where: { formId } }), prisma.formAssignment.createMany({ data: workerIds.map(workerId => ({ formId, workerId })) })]); },
  addAssignments(formId: string, workerIds: string[]) { return prisma.formAssignment.createMany({ data: workerIds.map(workerId => ({ formId, workerId })), skipDuplicates: true }); },
  isAssigned(formId: string, workerId: string) { return prisma.formAssignment.findUnique({ where: { formId_workerId: { formId, workerId } } }); },
  getVersion(id: string) { return prisma.formVersion.findUnique({ where: { id }, include: { form: true } }); },
  listVersionsForExport(formId: string, where: any) { return prisma.formVersion.findMany({ where: { formId }, include: { responses: { where, include: { worker: { select: { name: true } } } } }, orderBy: { version: 'asc' } }); }
};
