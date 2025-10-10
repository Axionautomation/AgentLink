import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutesOnly } from '../server/routes';

// Configure this function to use Edge Runtime for better performance
export const config = {
  runtime: 'edge',
};

let app: express.Application | null = null;

async function initializeApp() {
  if (app) return app;

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Register API routes only (without WebSocket server for edge/serverless)
  await registerRoutesOnly(app);

  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await initializeApp();

    // Handle the request with Express
    app(req as any, res as any);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
