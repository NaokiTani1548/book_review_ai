import { Module } from '@nestjs/common';
import { PromptService } from './prompt.service';
import { PromptController } from './prompt.controller';

@Module({
  providers: [PromptService],
  controllers: [PromptController],
  exports: [PromptService],
})
export class PromptModule {}
