import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
dotenv.config({ path: process.env.ENV_FILE ?? resolve(existsSync('server/.env') ? 'server/.env' : '.env') });
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
