import { Module } from '@nestjs/common';
import { ReviewModule } from './review/review.module';
import { PromptModule } from './prompt/prompt.module';

@Module({
  imports: [ReviewModule, PromptModule],
})
export class AppModule {}
