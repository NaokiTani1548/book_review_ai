import { promptClient } from '../grpc/client.js';
export async function handlePromptGet(request) {
    const { userId } = request.data;
    return new Promise((resolve, reject) => {
        promptClient.GetPrompt({ userId }, (err, response) => {
            if (err)
                reject(err);
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
export async function handlePromptCreate(request) {
    const { userId, content } = request.data;
    return new Promise((resolve, reject) => {
        promptClient.CreatePrompt({ userId, content }, (err, response) => {
            if (err)
                reject(err);
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
export async function handlePromptUpdate(request) {
    const { userId, content } = request.data;
    return new Promise((resolve, reject) => {
        promptClient.UpdatePrompt({ userId, content }, (err, response) => {
            if (err)
                reject(err);
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
//# sourceMappingURL=prompt.handler.js.map