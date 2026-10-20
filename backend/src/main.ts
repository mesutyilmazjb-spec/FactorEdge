import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  app.enableCors({
  origin: 'http://localhost:5173',
});

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();



// Buradaki:
// whitelist: true

// DTO'da olmayan alanları temizler.
// forbidNonWhitelisted: true

// bilinmeyen property gönderildiğinde hata verir.
// Mesela client:
// {
//   "name": "Band 1",
//   "protocol": "modbus",
//   "host": "192.168.1.50",
//   "port": 5020,
//   "isSuperAdmin": true
// }

// gönderirse:
// 400 Bad Request

// alır.
