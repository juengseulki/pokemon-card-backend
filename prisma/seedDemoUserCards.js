/**
 * 발표 시연용 데모 카드 시드.
 *
 * DEMO_EMAIL 계정에 TCGdex 실제 포켓몬 카드 30장을 생성하고 소유시킨다.
 *
 * 사용법:
 *   node prisma/seedDemoUserCards.js
 *
 * 환경변수:
 *   DEMO_EMAIL       대상 계정 (기본: seulking@test.com)
 *   SEED_SETS        가져올 세트 (기본: swsh3,sv1)
 *   SEED_LANG        언어 (기본: en — 이미지 커버리지가 가장 넓다)
 *   DEMO_CARD_COUNT  카드 장수 (기본: 30)
 *
 * 주의: 이미지 URL은 절대 직접 조립하지 않는다.
 *       tcgdexCardToPhotoCard()가 API의 card.image 값에서만 파생시킨다.
 */
import { PrismaClient, CardStatus } from '@prisma/client';

import { tcgdexCardToPhotoCard } from '../src/constants/tcgdex.js';
import { fetchTcgdexCards } from './tcgdexFetch.js';

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_EMAIL ?? 'seulking@test.com';

const COPIES_PER_CARD = 5;

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: DEMO_EMAIL,
    },
  });

  if (!user) {
    throw new Error(`테스트 계정을 찾을 수 없습니다: ${DEMO_EMAIL}`);
  }

  console.log('데모 유저:', user.nickname);

  const setIds = (process.env.SEED_SETS ?? 'swsh3,sv1')
    .split(',')
    .filter(Boolean);
  const lang = process.env.SEED_LANG ?? 'en';
  const limit = Number(process.env.DEMO_CARD_COUNT ?? 30);

  console.log(
    `TCGdex에서 카드 수집 중 (lang=${lang}, sets=${setIds.join(',')})...`
  );

  const tcgdexCards = await fetchTcgdexCards({ setIds, lang, limit });

  console.log(`카드 ${tcgdexCards.length}장 수집 완료.`);

  let created = 0;

  for (const card of tcgdexCards) {
    const mapped = tcgdexCardToPhotoCard(card);

    // 이미지 없는 카드는 시연 화면이 깨지므로 건너뛴다.
    if (!mapped.imageUrl) continue;

    const photoCard = await prisma.photoCard.create({
      data: {
        ...mapped,

        // 데모 카드는 "유저가 만든 카드"로 취급한다.
        // 따라서 공식 카탈로그 전용 필드인 tcgdexId는 null이어야 한다.
        // (tcgdexId는 @unique이므로, 공식 카탈로그와 값이 겹치면 시드가 실패한다)
        tcgdexId: null,

        totalQuantity: COPIES_PER_CARD,

        creatorId: user.id,
      },
    });

    await prisma.cardCopy.createMany({
      data: Array.from({ length: COPIES_PER_CARD }).map((_, index) => ({
        photoCardId: photoCard.id,
        ownerId: user.id,
        status: CardStatus.OWNED,
        serialNumber: `DEMO-${photoCard.id}-${String(index + 1).padStart(3, '0')}`,
      })),
    });

    created++;
  }

  console.log(
    `🎉 데모 카드 생성 완료! ${created}장 (각 ${COPIES_PER_CARD}매씩 소유)`
  );
}

main()
  .catch((err) => {
    console.error('데모 시드 실패:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
