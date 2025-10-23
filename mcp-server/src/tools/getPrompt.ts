import { grpcClient } from '../grpc/client.js';

export const getPrompt = {
  name: 'get_prompt',
  description: 'ユーザーに紐づけられた文章特徴プロンプトを取得します',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'number' },
    },
    required: ['userId'],
  },
  func: async ({ userId }: { userId: string }) => {
    return new Promise((resolve, reject) => {
      grpcClient.GetPrompt({ userId }, (err: any, res: any) => {
        if (err) return reject(err);
        resolve({ content: res.content });
      });
    });
  },
};
