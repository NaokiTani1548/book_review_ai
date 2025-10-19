import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'review',
      protoPath: join(__dirname, '../proto/review.proto'),
      url: '0.0.0.0:5000',
    },
  });

  await app.listen();
  console.log('🚀 gRPC MCP server running on port 5000');
}
bootstrap();
