import dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE ?? 'server/.env' });
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
