import { prisma } from './prisma.js';

export const responseRepository = {
  findByClientId(clientId: string) { return prisma.response.findUnique({ where: { clientId } }); },
  create(data: any) { return prisma.response.create({ data }); },
  list(where: any, page: number, take: number) { return Promise.all([prisma.response.findMany({ where, include: { worker: { select: { id: true, name: true } }, formVersion: { include: { form: true } } }, orderBy: { collectedAt: 'desc' }, skip: (page - 1) * take, take }), prisma.response.count({ where })]); },
  findVisible(id: string, userId: string, isAdmin: boolean) { return prisma.response.findFirst({ where: isAdmin ? { id } : { id, workerId: userId }, include: { worker: { select: { id: true, name: true } }, formVersion: { include: { form: true } } } }); }
};
