import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PromptService {
  private prisma = new PrismaClient();

  async updatePrompt(userId: number, content: string) {
    const existing = await this.prisma.prompt.findUnique({ where: { userId } });
    if (existing) {
      await this.prisma.prompt.update({
        where: { userId },
        data: { content },
      });
    } else {
      await this.prisma.prompt.create({
        data: { userId, content },
      });
    }
    return true;
  }

  async getPrompt(userId: number) {
    const prompt = await this.prisma.prompt.findUnique({ where: { userId } });
    return prompt?.content || '';
  }
}
