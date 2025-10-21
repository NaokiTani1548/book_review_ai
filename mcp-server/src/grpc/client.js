import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
const PROTO_PATH = path.resolve(__dirname, './proto/review.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const reviewProto = grpc.loadPackageDefinition(packageDefinition).review;
export const promptClient = new reviewProto.PromptService('localhost:50051', grpc.credentials.createInsecure());
//# sourceMappingURL=client.js.map