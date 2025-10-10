import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { createServer } from 'http';

// Import your existing Express app setup
// Note: This is a wrapper to make Express work with Vercel serverless functions

let app: express.Application;

async function initializeApp() {
  if (app) return app;

  // Dynamically import to avoid loading during build
  const { default: expressApp } = await import('../server/index');
  app = expressApp;
  return app;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await initializeApp();

  // Convert Vercel request to Express request
  return new Promise((resolve, reject) => {
    const server = createServer(app);
    server.emit('request', req, res);

    res.on('finish', resolve);
    res.on('error', reject);
  });
}
