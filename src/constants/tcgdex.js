/**
 * TCGdex → 내부 도메인 매핑의 단일 진실 공급원(Single Source of Truth).
 *
 * TCGdex의 rarity는 수십 종의 자유 문자열이므로,
 * 원본은 PhotoCard.rarity에 그대로 보존하고
 * 필터/뱃지/교환조건에 쓰이는 PhotoCard.grade는 여기서 4단계로 버킷팅한다.
 */

export const CARD_GRADES = ['COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY'];

export const CARD_TYPES = [
  'GRASS',
  'FIRE',
  'WATER',
  'LIGHTNING',
  'PSYCHIC',
  'FIGHTING',
  'DARKNESS',
  'METAL',
  'FAIRY',
  'DRAGON',
  'COLORLESS',
  'TRAINER',
  'ENERGY',
];

export const CARD_CATEGORIES = ['POKEMON', 'TRAINER', 'ENERGY'];

/**
 * TCGdex `types[]` (영문) → CardType enum
 */
const TYPE_MAP = {
  grass: 'GRASS',
  fire: 'FIRE',
  water: 'WATER',
  lightning: 'LIGHTNING',
  electric: 'LIGHTNING',
  psychic: 'PSYCHIC',
  fighting: 'FIGHTING',
  darkness: 'DARKNESS',
  dark: 'DARKNESS',
  metal: 'METAL',
  steel: 'METAL',
  fairy: 'FAIRY',
  dragon: 'DRAGON',
  colorless: 'COLORLESS',
  normal: 'COLORLESS',
};

/**
 * TCGdex `category` → CardCategory enum
 */
const CATEGORY_MAP = {
  pokemon: 'POKEMON',
  trainer: 'TRAINER',
  energy: 'ENERGY',
};

/**
 * rarity(원본 문자열) → grade(4단계) 버킷팅 규칙.
 *
 * 정확히 일치하는 키를 먼저 찾고, 없으면 아래 RARITY_PATTERNS로 폴백한다.
 * TCGdex가 새 rarity를 추가해도 패턴이 흡수하므로 시드가 깨지지 않는다.
 */
const RARITY_EXACT = {
  // --- COMMON ---
  none: 'COMMON',
  common: 'COMMON',
  uncommon: 'COMMON',

  // --- RARE ---
  rare: 'RARE',
  'rare holo': 'RARE',
  'double rare': 'RARE',
  'four diamond': 'RARE',

  // --- SUPER_RARE ---
  'ultra rare': 'SUPER_RARE',
  'rare holo ex': 'SUPER_RARE',
  'rare holo gx': 'SUPER_RARE',
  'rare holo v': 'SUPER_RARE',
  'rare holo vmax': 'SUPER_RARE',
  'rare holo vstar': 'SUPER_RARE',
  'rare ultra': 'SUPER_RARE',
  'rare break': 'SUPER_RARE',
  'rare prime': 'SUPER_RARE',
  'illustration rare': 'SUPER_RARE',
  'one star': 'SUPER_RARE',
  'two star': 'SUPER_RARE',

  // --- LEGENDARY ---
  'secret rare': 'LEGENDARY',
  'rare secret': 'LEGENDARY',
  'rare rainbow': 'LEGENDARY',
  'hyper rare': 'LEGENDARY',
  'special illustration rare': 'LEGENDARY',
  'rare shiny': 'LEGENDARY',
  'rare shining': 'LEGENDARY',
  'shiny rare': 'LEGENDARY',
  'amazing rare': 'LEGENDARY',
  'radiant rare': 'LEGENDARY',
  'three star': 'LEGENDARY',
  crown: 'LEGENDARY',
  'crown rare': 'LEGENDARY',
  legend: 'LEGENDARY',
};

/**
 * 위 표에 없는 rarity를 위한 폴백 패턴. 위에서부터 순서대로 검사한다.
 * 더 희귀한 등급을 먼저 검사해야 "special illustration rare"가
 * "illustration rare"보다 먼저 잡힌다.
 */
const RARITY_PATTERNS = [
  [
    /(secret|rainbow|hyper|crown|shiny|shining|amazing|radiant|legend)/,
    'LEGENDARY',
  ],
  [/special\s+illustration/, 'LEGENDARY'],
  [
    /(illustration|ultra|\bex\b|\bgx\b|\bv(max|star)?\b|break|prime|full\s*art)/,
    'SUPER_RARE',
  ],
  [/rare/, 'RARE'],
  [/(common|uncommon|none)/, 'COMMON'],
];

const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

/**
 * TCGdex rarity 문자열을 CardGrade로 버킷팅한다.
 * 알 수 없는 값은 안전하게 COMMON으로 떨어진다.
 *
 * @param {string|null|undefined} rarity
 * @returns {'COMMON'|'RARE'|'SUPER_RARE'|'LEGENDARY'}
 */
export function rarityToGrade(rarity) {
  const key = normalize(rarity);

  if (!key) return 'COMMON';

  if (RARITY_EXACT[key]) return RARITY_EXACT[key];

  for (const [pattern, grade] of RARITY_PATTERNS) {
    if (pattern.test(key)) return grade;
  }

  return 'COMMON';
}

/**
 * TCGdex types[] → CardType.
 * Trainer/Energy 카드는 types가 없으므로 category로 대체한다.
 *
 * @param {string[]|null|undefined} types
 * @param {string|null|undefined} category
 * @returns {string} CardType enum 값
 */
export function typesToCardType(types, category) {
  const first = Array.isArray(types) ? types.find(Boolean) : types;
  const mapped = TYPE_MAP[normalize(first)];

  if (mapped) return mapped;

  const cat = normalize(category);

  if (cat === 'trainer') return 'TRAINER';
  if (cat === 'energy') return 'ENERGY';

  return 'COLORLESS';
}

/**
 * TCGdex category → CardCategory enum
 */
export function toCardCategory(category) {
  return CATEGORY_MAP[normalize(category)] ?? 'POKEMON';
}

/**
 * grade별 기본 판매가(포인트). 유저가 가격을 지정하지 않은
 * 공식 카드 시드에 사용한다.
 */
export const GRADE_BASE_PRICE = {
  COMMON: 1000,
  RARE: 5000,
  SUPER_RARE: 15000,
  LEGENDARY: 50000,
};

/**
 * grade별 기본 발행 수량. 희귀할수록 적게 발행한다.
 */
export const GRADE_BASE_QUANTITY = {
  COMMON: 20,
  RARE: 10,
  SUPER_RARE: 4,
  LEGENDARY: 1,
};

/**
 * TCGdex Card 객체 → PhotoCard create 입력으로 변환.
 * creatorId를 넘기지 않으면 공식 카드(creatorId=null)가 된다.
 *
 * @param {object} card TCGdex Card
 * @param {object} [options]
 * @param {string|null} [options.creatorId] 유저 생성 카드일 때만 지정
 * @returns {object} prisma.photoCard.create({ data }) 용 객체
 */
export function tcgdexCardToPhotoCard(card, { creatorId = null } = {}) {
  const grade = rarityToGrade(card.rarity);

  return {
    name: card.name,
    description:
      card.description ?? `${card.name} - ${card.set?.name ?? ''}`.trim(),
    imageUrl: card.image ? `${card.image}/high.webp` : '',

    grade,
    type: typesToCardType(card.types, card.category),
    rarity: card.rarity ?? null,

    tcgdexId: card.id,
    category: toCardCategory(card.category),
    setId: card.set?.id ?? null,
    setName: card.set?.name ?? null,
    illustrator: card.illustrator ?? null,
    hp: typeof card.hp === 'number' ? card.hp : null,
    dexId: Array.isArray(card.dexId) ? (card.dexId[0] ?? null) : null,
    stage: card.stage ?? null,

    totalQuantity: GRADE_BASE_QUANTITY[grade],
    initialPrice: GRADE_BASE_PRICE[grade],

    creatorId,
  };
}
