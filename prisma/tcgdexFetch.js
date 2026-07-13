import fs from 'fs/promises';
import path from 'path';

const API = 'https://api.tcgdex.net/v2';

const CACHE_DIR = path.join(process.cwd(), 'prisma', '.tcgdex-cache');

async function readCache(key) {
  try {
    const raw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), 'utf-8');

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCache(key, value) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(
      path.join(CACHE_DIR, `${key}.json`),
      JSON.stringify(value),
      'utf-8'
    );
  } catch {}
}

async function fetchJson(url) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`TCGdex 요청 실패 (${res.status}): ${url}`);
  }

  return res.json();
}

export async function fetchTcgdexCards({ setIds, lang, limit = Infinity }) {
  const cacheKey = `${lang}-${setIds.join('_')}-${limit}`;

  const cached = await readCache(cacheKey);

  if (cached) {
    console.log(`  (캐시 사용: ${cached.length}장)`);

    return cached;
  }

  const collected = [];

  for (const setId of setIds) {
    if (collected.length >= limit) break;

    const set = await fetchJson(`${API}/${lang}/sets/${setId}`);

    const briefs = (set.cards ?? []).filter((brief) => brief.image);

    console.log(
      `  · ${setId} (${set.name}) - 이미지 있는 카드 ${briefs.length}장`
    );

    const BATCH = 10;

    for (let i = 0; i < briefs.length && collected.length < limit; i += BATCH) {
      const chunk = briefs.slice(i, i + BATCH);

      const detailed = await Promise.all(
        chunk.map((brief) =>
          fetchJson(`${API}/${lang}/cards/${brief.id}`).catch(() => null)
        )
      );

      for (const card of detailed) {
        if (!card || !card.image) continue;
        if (collected.length >= limit) break;

        collected.push(card);
      }
    }
  }

  await writeCache(cacheKey, collected);

  return collected;
}
