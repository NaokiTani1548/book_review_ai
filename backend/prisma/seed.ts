import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
const prisma = new PrismaClient();

async function main() {
  await prisma.prompt.createMany({
    data: [
      { userId: 1, content: '口語的で短文多め' },
      { userId: 2, content: '文語体で感情表現豊か。語尾がですねー、ますーで終わる' },
    ],
    skipDuplicates: true,
  });

  await prisma.review.createMany({
    data: [
      {
        userId: 1,
        bookTitle: 'はじめてのNestJS',
        bookAuthor: 'Naoki Tani',
        markdown: '# はじめてのNestJS\n口語的で短文多め この本は初心者におすすめです。',
      },
      {
        userId: 2,
        bookTitle: 'AI入門',
        bookAuthor: 'Jane Doe',
        markdown: '# AI入門\n文語体で感情表現豊か この本は読み応えがあります。',
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
