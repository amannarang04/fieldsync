import { prisma } from './prisma.js';
import type { Role } from '@prisma/client';

export const userRepository = {
  findByEmail(email: string) { return prisma.user.findUnique({ where: { email } }); },
  findPublicById(id: string) { return prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } }); },
  create(data: { email: string; name: string; passwordHash: string; role: Role }) { return prisma.user.create({ data }); },
  listWorkers() { return prisma.user.findMany({ where: { role: 'WORKER' }, select: { id: true, name: true, email: true } }); },
  findWorkersByIds(ids: string[]) { return prisma.user.findMany({ where: { id: { in: ids }, role: 'WORKER' }, select: { id: true } }); }
};
