import type { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler = (handler: (req: Request, res: Response) => unknown): RequestHandler =>
  (req, res, next) => { Promise.resolve(handler(req, res)).catch(next); };
