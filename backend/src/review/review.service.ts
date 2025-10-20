import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ReviewService {
  private prisma = new PrismaClient();

  // 過去書評取得
  async getReviews(userId: number) {
    return this.prisma.review.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
