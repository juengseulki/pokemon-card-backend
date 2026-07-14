-- 포토카드 도메인 → 포켓몬 TCG(TCGdex) 도메인 전환
--
-- 핵심 결정:
--  1. grade(CardGrade)는 그대로 유지한다. TCGdex의 rarity는 수십 종의 자유
--     문자열이므로 원본은 rarity 컬럼에 보존하고, grade는 4단계 파생 컬럼으로 둔다.
--     덕분에 기존 필터/뱃지/교환조건 로직이 깨지지 않는다.
--  2. genre(CardGenre) → type(CardType)으로 교체한다. K-POP 장르는 포켓몬에
--     대응물이 없으므로 값을 보존하지 않고 COLORLESS로 초기화한다.
--  3. creatorId를 nullable로 바꾼다. NULL = TCGdex 공식 카드, NOT NULL = 유저 생성 카드.

-- 1) 새 enum 생성
CREATE TYPE "CardType" AS ENUM (
  'GRASS', 'FIRE', 'WATER', 'LIGHTNING', 'PSYCHIC', 'FIGHTING',
  'DARKNESS', 'METAL', 'FAIRY', 'DRAGON', 'COLORLESS', 'TRAINER', 'ENERGY'
);

CREATE TYPE "CardCategory" AS ENUM ('POKEMON', 'TRAINER', 'ENERGY');

-- 2) PhotoCard: genre → type
--    기존 K-POP 장르는 포켓몬 타입으로 의미가 이어지지 않으므로 COLORLESS로 수렴시킨다.
ALTER TABLE "PhotoCard" ADD COLUMN "type" "CardType" NOT NULL DEFAULT 'COLORLESS';

DROP INDEX IF EXISTS "PhotoCard_genre_idx";
ALTER TABLE "PhotoCard" DROP COLUMN "genre";

-- 3) PhotoCard: TCGdex 카탈로그 필드 추가
ALTER TABLE "PhotoCard" ADD COLUMN "rarity"      TEXT;
ALTER TABLE "PhotoCard" ADD COLUMN "tcgdexId"    TEXT;
ALTER TABLE "PhotoCard" ADD COLUMN "category"    "CardCategory" NOT NULL DEFAULT 'POKEMON';
ALTER TABLE "PhotoCard" ADD COLUMN "setId"       TEXT;
ALTER TABLE "PhotoCard" ADD COLUMN "setName"     TEXT;
ALTER TABLE "PhotoCard" ADD COLUMN "illustrator" TEXT;
ALTER TABLE "PhotoCard" ADD COLUMN "hp"          INTEGER;
ALTER TABLE "PhotoCard" ADD COLUMN "dexId"       INTEGER;
ALTER TABLE "PhotoCard" ADD COLUMN "stage"       TEXT;

-- 4) creatorId를 nullable로. 기존 행은 전부 유저 생성 카드이므로 값이 유지된다.
ALTER TABLE "PhotoCard" ALTER COLUMN "creatorId" DROP NOT NULL;

-- 기존 FK는 ON DELETE RESTRICT였다. creatorId가 nullable이 되었으므로
-- 유저 삭제 시 카드를 지우지 않고 공식 카드처럼 남기려면 SET NULL이 자연스럽다.
ALTER TABLE "PhotoCard" DROP CONSTRAINT IF EXISTS "PhotoCard_creatorId_fkey";
ALTER TABLE "PhotoCard"
  ADD CONSTRAINT "PhotoCard_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- 5) Sale: exchangeGenre → exchangeType
ALTER TABLE "Sale" ADD COLUMN "exchangeType" "CardType";
ALTER TABLE "Sale" DROP COLUMN "exchangeGenre";

-- 6) 구 enum 제거 (위에서 참조가 모두 사라진 뒤여야 한다)
DROP TYPE "CardGenre";

-- 7) 인덱스
CREATE UNIQUE INDEX "PhotoCard_tcgdexId_key" ON "PhotoCard"("tcgdexId");
CREATE INDEX "PhotoCard_type_idx"   ON "PhotoCard"("type");
CREATE INDEX "PhotoCard_rarity_idx" ON "PhotoCard"("rarity");
CREATE INDEX "PhotoCard_setId_idx"  ON "PhotoCard"("setId");
