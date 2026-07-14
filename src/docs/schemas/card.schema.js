export const cardSchemas = {
  PhotoCard: {
    type: 'object',

    properties: {
      id: {
        type: 'number',
        example: 1,
      },

      name: {
        type: 'string',
        example: '스페인 여행',
      },

      description: {
        type: 'string',
        example: '스페인 여행에서 촬영한 포토카드입니다.',
      },

      imageUrl: {
        type: 'string',
        example: 'https://image.com/card.png',
      },

      grade: {
        type: 'string',
        enum: ['COMMON', 'RARE', 'SUPER_RARE', 'LEGENDARY'],
        example: 'COMMON',
      },

      type: {
        type: 'string',
        enum: [
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
        ],
        example: 'FIRE',
      },

      rarity: {
        type: 'string',
        nullable: true,
        description: 'TCGdex 원본 rarity 문자열',
        example: 'Illustration Rare',
      },

      tcgdexId: {
        type: 'string',
        nullable: true,
        description: 'TCGdex 카드 ID. null이면 유저 생성 카드',
        example: 'swsh3-136',
      },

      category: {
        type: 'string',
        enum: ['POKEMON', 'TRAINER', 'ENERGY'],
        example: 'POKEMON',
      },

      setId: { type: 'string', nullable: true, example: 'swsh3' },
      setName: { type: 'string', nullable: true, example: 'Darkness Ablaze' },
      illustrator: {
        type: 'string',
        nullable: true,
        example: 'tetsuya koizumi',
      },
      hp: { type: 'number', nullable: true, example: 110 },
      dexId: { type: 'number', nullable: true, example: 162 },
      stage: { type: 'string', nullable: true, example: 'Stage1' },

      totalQuantity: {
        type: 'number',
        example: 5,
      },

      initialPrice: {
        type: 'number',
        example: 10,
      },

      creator: {
        type: 'object',
        properties: {
          nickname: {
            type: 'string',
            example: '프로여행러',
          },
        },
      },

      createdAt: {
        type: 'string',
        format: 'date-time',
      },
    },
  },

  CreateCardRequest: {
    type: 'object',

    required: [
      'name',
      'description',
      'imageUrl',
      'grade',
      'type',
      'totalQuantity',
      'initialPrice',
    ],

    properties: {
      name: {
        type: 'string',
        example: '스페인 여행',
      },

      description: {
        type: 'string',
        example: '스페인 여행에서 찍은 사진입니다.',
      },

      imageUrl: {
        type: 'string',
        example: 'https://image.com/card.png',
      },

      grade: {
        type: 'string',
        example: 'COMMON',
      },

      type: {
        type: 'string',
        example: 'FIRE',
      },

      totalQuantity: {
        type: 'number',
        example: 5,
      },

      initialPrice: {
        type: 'number',
        example: 10,
      },
    },
  },

  CardListResponse: {
    type: 'object',

    properties: {
      data: {
        type: 'object',

        properties: {
          items: {
            type: 'array',

            items: {
              $ref: '#/components/schemas/PhotoCard',
            },
          },

          meta: {
            $ref: '#/components/schemas/Meta',
          },
        },
      },

      message: {
        type: 'string',
        example: 'success',
      },
    },
  },
};
