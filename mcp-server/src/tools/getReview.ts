import { grpcClient } from '../grpc/client.js';

export const getReview = {
  name: 'get_review',
  description: 'ユーザーが過去に書いた書評を取得します',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'number' },
    },
    required: ['userId'],
  },
  func: async ({ userId }: {userId: string}) => {
    return new Promise((resolve, reject) => {
      grpcClient.GetReviews({ userId }, (err: any, res: any) => {
        if (err) return reject(err);
        resolve({ reviews: res.reviews });
      });
    });
  },
};
