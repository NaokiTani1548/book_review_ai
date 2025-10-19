import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { ReviewService } from './review.service';

@Controller()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @GrpcMethod('ReviewService', 'GenerateReview')
  generateReview(data: { userId: number; bookId: number; profileId?: number }) {
    return this.reviewService.generateReview(data);
  }
}
