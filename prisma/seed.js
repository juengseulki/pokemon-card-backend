import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs/promises';
import path from 'path';
import {
  CARD_GRADES,
  CARD_TYPES,
  tcgdexCardToPhotoCard,
} from '../src/constants/tcgdex.js';
import { fetchTcgdexCards } from './tcgdexFetch.js';

const prisma = new PrismaClient();

async function readJson(fileName) {
  const filePath = path.join(process.cwd(), 'prisma', 'seed-data', fileName);
  const data = await fs.readFile(filePath, 'utf-8');

  return JSON.parse(data);
}

async function resetDatabase() {
  await prisma.notification.deleteMany();
  await prisma.exchangeProposal.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.cardCopy.deleteMany();
  await prisma.photoCard.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.pointHistory.deleteMany();
  await prisma.point.deleteMany();
  await prisma.user.deleteMany();
}

function validateCardSeed(card) {
  if (!CARD_GRADES.includes(card.grade)) {
    throw new Error(`지원하지 않는 등급입니다: ${card.grade}`);
  }

  if (!CARD_TYPES.includes(card.type)) {
    throw new Error(`지원하지 않는 타입입니다: ${card.type}`);
  }

  if (card.remainingQuantity > card.totalQuantity) {
    throw new Error(
      `remainingQuantity가 totalQuantity보다 큽니다: ${card.name}`
    );
  }
}

async function createUsers(users) {
  const userIdMap = new Map();

  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    const createdUser = await prisma.user.create({
      data: {
        email: user.email,
        password: hashedPassword,
        nickname: user.nickname,
        point: {
          create: {
            balance: user.points,
          },
        },
        pointHistories: {
          create: {
            amount: user.points,
            reason: 'SIGN_UP',
            description: '초기 가입 포인트 지급',
          },
        },
      },
    });

    userIdMap.set(user.id, createdUser.id);
  }

  return userIdMap;
}

async function createPhotoCards(cards, userIdMap) {
  for (const card of cards) {
    validateCardSeed(card);

    const creatorId = userIdMap.get(card.userId);

    if (!creatorId) {
      throw new Error(`존재하지 않는 userId입니다: ${card.userId}`);
    }

    await prisma.$transaction(async (tx) => {
      const photoCard = await tx.photoCard.create({
        data: {
          name: card.name,
          description: card.description,
          imageUrl: card.imageUrl,
          grade: card.grade,
          type: card.type,
          rarity: card.rarity,
          tcgdexId: null,
          category: card.category,
          setId: card.setId,
          setName: card.setName,
          illustrator: card.illustrator,
          hp: card.hp,
          dexId: card.dexId,
          stage: card.stage,
          totalQuantity: card.totalQuantity,
          initialPrice: card.price,
          creatorId,
        },
      });

      const createdCopies = [];

      for (let i = 1; i <= card.totalQuantity; i++) {
        const copy = await tx.cardCopy.create({
          data: {
            photoCardId: photoCard.id,
            ownerId: creatorId,
            status: 'OWNED',
            serialNumber: `CARD-${photoCard.id}-${String(i).padStart(3, '0')}`,
          },
        });

        createdCopies.push(copy);
      }

      const saleQuantity = Number(card.remainingQuantity) || 0;

      if (saleQuantity <= 0) {
        return;
      }

      const sale = await tx.sale.create({
        data: {
          sellerId: creatorId,
          photoCardId: photoCard.id,
          price: card.price,
          status: 'ON_SALE',
          exchangeGrade: null,
          exchangeType: null,
          exchangeDescription: null,
        },
      });

      const saleCopies = createdCopies.slice(0, saleQuantity);

      await tx.saleItem.createMany({
        data: saleCopies.map((copy) => ({
          saleId: sale.id,
          cardCopyId: copy.id,
        })),
      });

      await tx.cardCopy.updateMany({
        where: {
          id: {
            in: saleCopies.map((copy) => copy.id),
          },
          ownerId: creatorId,
          status: 'OWNED',
        },
        data: {
          status: 'ON_SALE',
        },
      });
    });
  }
}

function toSeedCards(tcgdexCards, users) {
  return tcgdexCards.map((card, index) => {
    const mapped = tcgdexCardToPhotoCard(card);

    const owner = users[index % users.length];

    const totalQuantity = mapped.totalQuantity;
    const remainingQuantity =
      index % 5 === 0 ? 0 : Math.max(1, Math.ceil(totalQuantity / 2));

    return {
      ...mapped,
      userId: owner.id,
      price: mapped.initialPrice,
      totalQuantity,
      remainingQuantity,
    };
  });
}

async function main() {
  const users = await readJson('users.json');

  const setIds = (process.env.SEED_SETS ?? 'swsh3,sv1')
    .split(',')
    .filter(Boolean);
  const lang = process.env.SEED_LANG ?? 'en';
  const limit = Number(process.env.SEED_CARD_COUNT ?? 100);

  console.log(
    `TCGdex에서 카드 수집 중 (lang=${lang}, sets=${setIds.join(',')})...`
  );

  const tcgdexCards = await fetchTcgdexCards({ setIds, lang, limit });

  console.log(`카드 ${tcgdexCards.length}장 수집 완료.`);

  const cards = toSeedCards(tcgdexCards, users);

  await resetDatabase();

  const userIdMap = await createUsers(users);

  await createPhotoCards(cards, userIdMap);

  console.log(`Seed 완료! 유저 ${users.length}명 / 카드 ${cards.length}장`);
}

main()
  .catch((error) => {
    console.error('Seed 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
