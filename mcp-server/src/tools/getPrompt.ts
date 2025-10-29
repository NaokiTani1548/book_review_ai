import { grpcClient } from '../grpc/client.js';

export const getPrompt = {
  name: 'get_prompt',
  description: 'ユーザーに紐づけられた文章特徴プロンプトを取得します',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
    },
    required: ['userId'],
  },
  func: async ({ userId }: { userId: string }) => {
    try {
      const res = await new Promise<any>((resolve, reject) => {
        grpcClient.GetPrompt({ userId }, (err: any, res: any) => {
            if (err) {
                console.error("Error in GetPrompt:", err);
                return reject(err);
            }
            console.log("GetPrompt response:", res)
            resolve(res);
        });
      });

      const textContent =
        typeof res.content === 'string'
          ? res.content
          : JSON.stringify(res.content);

      return {
        content: [
          {
            type: 'text',
            text: String(textContent),
          },
        ],
      };
    } catch (err: any) {
      console.error("Error in getPrompt function:", err);
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${err.message || String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
};
