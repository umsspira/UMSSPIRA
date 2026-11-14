import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';

let cachedServer: Express;

export async function createNestServer(): Promise<Express> {
  if (!cachedServer) {
    const server: Express = express();
    const app: INestApplication = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.enableCors();
    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

// Local standalone server
async function bootstrapLocal() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}

// Only launch standalone listener when not in Vercel serverless environment
if (!process.env.VERCEL) {
  void bootstrapLocal();
}

// Vercel serverless function export
export default async function handler(req: any, res: any) {
  try {
    const server = await createNestServer();
    server(req, res);
  } catch (err: any) {
    console.error('NestJS bootstrap serverless error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'NESTJS_BOOTSTRAP_ERROR',
        message:
          'Failed to initialize Nest application in serverless environment.',
        details: String(err?.message || err),
        stack: err?.stack,
      }),
    );
  }
}