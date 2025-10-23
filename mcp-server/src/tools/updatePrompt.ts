import { grpcClient } from '../grpc/client.js';

export const updatePrompt = {
  name: 'update_prompt',
  description: 'プロンプトをユーザーと紐づけて保存します',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'number' },
      content: { type: 'string' },
    },
    required: ['userId', 'content'],
  },
  func: async ({ userId, content }: { userId: string; content: string }) => {
    return new Promise((resolve, reject) => {
      grpcClient.UpdatePrompt({ userId, content }, (err: any, res: any) => {
        if (err) return reject(err);
        resolve({ success: res.success });
      });
    });
  },
};
