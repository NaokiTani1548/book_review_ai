import { Injectable } from '@nestjs/common';

@Injectable()
export class ReviewService {
  generateReview(data: { userId: number; bookId: number; profileId?: number }) {
    // 仮のレスポンス（後でLLM呼び出しに置き換える）
    const markdown = `# Sample Review\n\nUser ${data.userId} reviewed book ${data.bookId}.`;
    return { markdown };
  }
}
