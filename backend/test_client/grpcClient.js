import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// protoファイルをロード
const packageDef = protoLoader.loadSync(path.join(__dirname, '../proto/review.proto'));
const grpcObj = grpc.loadPackageDefinition(packageDef);

// ReviewServiceクライアント作成
const client = new grpcObj.review.ReviewService(
  'localhost:5000',
  grpc.credentials.createInsecure()
);

// テストRPC呼び出し
client.GenerateReview({ userId: 1, bookId: 2 }, (err, res) => {
  if (err) console.error(err);
  else console.log('✅ Review Generated:', res.markdown);
});
