import { PrismaClient } from '@prisma/client';

import { tcgdexCardToPhotoCard } from '../src/constants/tcgdex.js';
import { fetchTcgdexCards } from './tcgdexFetch.js';

const prisma = new PrismaClient();

const DEFAULT_SETS = ['swsh3', 'sv1'];

function parseArgs(argv) {
  // 이미지는 언어별로 존재 여부가 다름. 'en'이 커버리지가 가장 넓으므로 기본값이며 ko는 이미지가 없는 카드가 많아 404 에러가 자주뜸
  const args = { lang: 'en', sets: DEFAULT_SETS };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--lang') args.lang = argv[++i];
    else if (argv[i] === '--sets')
      args.sets = argv[++i].split(',').filter(Boolean);
  }

  return args;
}

async function upsertOfficialCards(cards) {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const card of cards) {
    const data = tcgdexCardToPhotoCard(card);

    // 이미지가 없는 카드는 UI에서 깨지므로 건너뛰게
    if (!data.imageUrl) {
      skipped++;

      continue;
    }

    const existing = await prisma.photoCard.findUnique({
      where: { tcgdexId: data.tcgdexId },
      select: { id: true },
    });

    await prisma.photoCard.upsert({
      where: { tcgdexId: data.tcgdexId },
      create: data,
      update: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        grade: data.grade,
        type: data.type,
        rarity: data.rarity,
        category: data.category,
        setId: data.setId,
        setName: data.setName,
        illustrator: data.illustrator,
        hp: data.hp,
        dexId: data.dexId,
        stage: data.stage,
      },
    });

    if (existing) updated++;
    else created++;
  }

  return { created, updated, skipped };
}

async function main() {
  const { lang, sets } = parseArgs(process.argv);

  console.log(`TCGdex 시드 시작 (lang=${lang}, sets=${sets.join(',')})`);

  const all = await fetchTcgdexCards({ setIds: sets, lang });

  console.log(`총 ${all.length}장 수집 완료. DB 반영 중...`);

  const { created, updated, skipped } = await upsertOfficialCards(all);

  console.log(
    `완료! 신규 ${created}장 / 갱신 ${updated}장 / 이미지 없어 건너뜀 ${skipped}장`
  );

  const dist = await prisma.photoCard.groupBy({
    by: ['grade'],
    where: { creatorId: null },
    _count: true,
  });

  console.log('\n공식 카드 등급 분포:');
  for (const row of dist) {
    console.log(`  ${row.grade.padEnd(12)} ${row._count}`);
  }
}

main()
  .catch((error) => {
    console.error('TCGdex 시드 실패:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
