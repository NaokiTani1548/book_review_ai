import { promptClient } from '../grpc/client.js';

export async function handlePromptGet(request: any) {
  const { userId } = request.data;
  return new Promise((resolve, reject) => {
    promptClient.GetPrompt({ userId }, (err: any, response: any) => {
      if (err) reject(err);
      else
        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify(response),
            },
          ],
          _meta: {},
        });
    });
  });
}

export async function handlePromptCreate(request: any) {
  const { userId, content } = request.data;
  return new Promise((resolve, reject) => {
    promptClient.CreatePrompt({ userId, content }, (err: any, response: any) => {
      if (err) reject(err);
      else
        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify(response),
            },
          ],
          _meta: {},
        });
    });
  });
}

export async function handlePromptUpdate(request: any) {
  const { userId, content } = request.data;
  return new Promise((resolve, reject) => {
    promptClient.UpdatePrompt({ userId, content }, (err: any, response: any) => {
      if (err) reject(err);
      else
        resolve({
          content: [
            {
              type: 'text',
              text: JSON.stringify(response),
            },
          ],
          _meta: {},
        });
    });
  });
}
