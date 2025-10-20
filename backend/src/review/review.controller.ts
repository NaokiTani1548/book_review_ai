import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ReviewService } from './review.service';

interface GetReviewsRequest {
  userId: number;
}

interface Review {
  bookTitle: string;
  bookAuthor: string;
  markdown: string;
  createdAt: string;
}

interface GetReviewsResponse {
  reviews: Review[];
}

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @GrpcMethod('ReviewService', 'GetReviews')
  async getReviews(data: GetReviewsRequest): Promise<GetReviewsResponse> {
    const reviews = await this.reviewService.getReviews(data.userId);
    return {
      reviews: reviews.map(r => ({
        bookTitle: r.bookTitle,
        bookAuthor: r.bookAuthor,
        markdown: r.markdown,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }
}
