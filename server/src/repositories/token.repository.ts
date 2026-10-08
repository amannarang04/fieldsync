import { prisma } from './prisma.js';

export const tokenRepository = {
  create(tokenHash: string, userId: string) { return prisma.refreshToken.create({ data: { tokenHash, userId, expiresAt: new Date(Date.now() + 30 * 86400000) } }); },
  find(tokenHash: string) { return prisma.refreshToken.findUnique({ where: { tokenHash } }); },
  delete(tokenHash: string) { return prisma.refreshToken.deleteMany({ where: { tokenHash } }); },
  deleteById(id: string) { return prisma.refreshToken.delete({ where: { id } }); }
};
