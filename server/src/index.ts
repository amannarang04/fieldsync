import dotenv from 'dotenv';
dotenv.config({ path: process.env.ENV_FILE ?? 'server/.env' });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import apiRoutes from './routes/index.js';
import { validateRequest } from './middleware/validateRequest.js';
import { prisma } from './repositories/prisma.js';

export const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(validateRequest);
app.use('/api', apiRoutes);
app.use((_req, res) => res.status(404).json({ error: { message: 'Not found' } }));
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: { message: 'Internal server error' } });
});

const port = Number(process.env.PORT ?? 3001);
if (process.env.NODE_ENV !== 'test') app.listen(port, () => console.log(`FieldSync API listening on ${port}`));

export { prisma };
