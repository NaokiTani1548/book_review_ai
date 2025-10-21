import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, './proto/review.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const reviewProto: any = grpc.loadPackageDefinition(packageDefinition).review;

export const promptClient = new reviewProto.ReviewService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);
