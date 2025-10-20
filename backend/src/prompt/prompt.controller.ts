import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { PromptService } from './prompt.service';

interface PromptRequest {
  userId: number;
  content: string;
}

interface PromptResponse {
  success: boolean;
}

interface GetPromptRequest {
  userId: number;
}

interface GetPromptResponse {
  content: string;
}

@Controller()
export class PromptController {
  constructor(private readonly promptService: PromptService) {}

  @GrpcMethod('ReviewService', 'UpdatePrompt')
  async updatePrompt(data: PromptRequest): Promise<PromptResponse> {
    const success = await this.promptService.updatePrompt(data.userId, data.content);
    return { success };
  }

  @GrpcMethod('ReviewService', 'GetPrompt')
  async getPrompt(data: GetPromptRequest): Promise<GetPromptResponse> {
    const content = await this.promptService.getPrompt(data.userId);
    return { content };
  }
}
