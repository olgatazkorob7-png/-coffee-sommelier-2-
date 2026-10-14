import { GoogleGenAI } from '@google/genai';
import { buildSystemPrompt, CATALOG, KNOWLEDGE_BASE, SUPPORT_CONTACT, ProductItem } from '@/lib/coffee-data';

interface SommelierResponse {
  content: string;
  category: string;
  source: 'из базы' | 'из каталога' | 'общий';
  recommendedProducts: ProductItem[];
  suggestedFollowUps: string[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function classifyQueryLocally(question: string): {
  category: string;
  source: 'из базы' | 'из каталога' | 'общий';
  matchedKbAnswer?: string;
  recommendedProductIds: string[];
} {
  const lower = question.toLowerCase();

  // Medical check: strictly reject medical questions
  const medicalWords = ['давлен', 'сердц', 'тахикард', 'врач', 'беремен', 'детям', 'диагноз', 'болезн', 'лечен', 'безопасн', 'доза', 'вред', 'полезен', 'здоровь', 'тревож', 'сон', 'бессон'];
  const isMedical = medicalWords.some(w => lower.includes(w));
  if (isMedical) {
    return {
      category: 'Медицина (отказ)',
      source: 'общий',
      matchedKbAnswer: 'Я не могу давать медицинские рекомендации. Пожалуйста, проконсультируйтесь с врачом.',
      recommendedProductIds: []
    };
  }

  // Storage check: strict priority rule
  if (lower.includes('срок') && lower.includes('хранен') || lower.includes('сколько хранится')) {
    return {
      category: 'Хранение',
      source: 'из базы',
      matchedKbAnswer: 'Оптимальный срок хранения — 3–4 недели с даты обжарки для фильтр-методов и 4–6 недель для эспрессо.\n\nХраните кофе в герметичной пачке с дегазационным клапаном в сухом тёмном шкафу без резких перепадов температуры и посторонних запахов.',
      recommendedProductIds: ['ethiopia-yirgacheffe', 'brazil-cerrado']
    };
  }

  if (lower.includes('в морозил') || lower.includes('замороз')) {
    return {
      category: 'Хранение',
      source: 'из базы',
      matchedKbAnswer: 'Да, для длительного хранения можно заморозить молотый кофе в герметичной упаковке, но размораживать нужно полностью перед использованием, не открывая упаковку.',
      recommendedProductIds: []
    };
  }

  if (lower.includes('как правильно хранить') || lower.includes('хранить в зерн') || lower.includes('в холодильник')) {
    return {
      category: 'Хранение',
      source: 'из базы',
      matchedKbAnswer: 'Храните в герметичной упаковке с клапаном, в тёмном прохладном месте, без резких перепадов температуры. Не храните в холодильнике — конденсат и запахи испортят зерно.',
      recommendedProductIds: []
    };
  }

  // Grind checks
  if (lower.includes('турк') || lower.includes('джезв')) {
    return {
      category: 'Помол',
      source: 'из базы',
      matchedKbAnswer: 'Для турки (джезвы) нужен самый тонкий помол — как пудра или мука. Если помол грубее, напиток не раскроется и во вкусе будет ощущаться неприятный «песок».\n\nХотите, подберу сорт тёмной или средней обжарки под турку?',
      recommendedProductIds: ['cezve-soy-copper', 'brazil-cerrado', 'india-plantation-a']
    };
  }

  if (lower.includes('v60') || lower.includes('воронк')) {
    return {
      category: 'Помол',
      source: 'из базы',
      matchedKbAnswer: 'Для воронки V60 нужен средний помол — по текстуре как морская соль. Слишком тонкий помол забьёт поры бумажного фильтра и даст горечь, а слишком крупный — водянистую ненасыщенную чашку.\n\nМогу порекомендовать яркие моносорта с фруктовой кислотностью под воронку.',
      recommendedProductIds: ['hario-v60-ceramic', 'hario-filters-v60', 'ethiopia-yirgacheffe']
    };
  }

  if (lower.includes('эспрессо') && lower.includes('аэропресс')) {
    return {
      category: 'Помол',
      source: 'из базы',
      matchedKbAnswer: 'Для эспрессо помол очень тонкий (мельче кристалликов сахара), а для аэропресса — средний или средне-крупный. Аэропресс прощает больше вариаций, а эспрессо требует прецизионной точности настройки кофемолки.',
      recommendedProductIds: ['blend-crema-barista', 'aeropress-original']
    };
  }

  // Acidity / Fruit
  if (lower.includes('кислотн') || lower.includes('фрукт') || lower.includes('кислинк') || lower.includes('ягод')) {
    return {
      category: 'Подбор сорта',
      source: 'из каталога',
      recommendedProductIds: ['ethiopia-yirgacheffe', 'kenya-aa'],
      matchedKbAnswer: 'Для высокой кислотности и фруктовости идеально подойдут эфиопские и кенийские моносорта мытой обработки. Они обладают искрящимся вкусом с нотами цитрусов, ягод и цветов.\n\nВот отличные варианты из нашего каталога:\n- **Эфиопия Иргачеффе** (жасмин, бергамот, персик, 890 ₽)\n- **Кения АА Киринси** (красная смородина, шиповник, 990 ₽)\n\nХотите, подскажу рецепт заваривания в воронке?'
    };
  }

  // Chocolate / Dense / Without acidity
  if (lower.includes('шоколад') || lower.includes('плотн') || lower.includes('без кисл') || lower.includes('орех')) {
    return {
      category: 'Подбор сорта',
      source: 'из каталога',
      recommendedProductIds: ['brazil-cerrado', 'india-plantation-a'],
      matchedKbAnswer: 'Вам прекрасно подойдут бразильские и индийские моносорта натуральной или тёмной обжарки, а также сбалансированные блэнды. В них практически отсутствует кислотность, а доминируют ноты тёмного шоколада, жареного ореха и карамели.\n\nРекомендую:\n- **Бразилия Серрадо** (тёмный шоколад, жареный фундук, 690 ₽)\n- **Индия Плантейшн А** (горький шоколад, пряности, 650 ₽)\n\nПод какой способ заваривания подбираете: эспрессо, турка или гейзер?'
    };
  }

  // Subscription
  if (lower.includes('подписк') || lower.includes('интервал') || lower.includes('регулярн')) {
    return {
      category: 'Подписка',
      source: 'из базы',
      recommendedProductIds: ['subscription-fresh'],
      matchedKbAnswer: 'Подписка оформляется на сайте в разделе «Подписка». Вы выбираете сорт, объём, интервал доставки (раз в 2, 3 или 4 недели) и способ оплаты.\n\nВ личном кабинете вы можете в любой момент изменить интервал, поставить доставку на паузу или отменить подписку без штрафов. На каждую пачку в подписке действует скидка 15% и бесплатная доставка.\n\nХотите, помогу выбрать интервал под Ваш расход кофе?'
    };
  }

  // Delivery / Payment / Return
  if (lower.includes('доставк') || lower.includes('оплат') || lower.includes('возврат') || lower.includes('сдэк')) {
    return {
      category: 'Доставка и оплата',
      source: 'из базы',
      recommendedProductIds: [],
      matchedKbAnswer: 'Доставка по городу курьером занимает 1–2 дня, по России отправляем СДЭК и Почтой России (3–7 дней). Бесплатный самовывоз со склада.\n\nОплата: банковские карты, СБП, электронные кошельки и оплата при получении курьеру.\n\nВозврат возможен в течение 14 дней при сохранности заводской упаковки.'
    };
  }

  return {
    category: 'Подбор сорта',
    source: 'общий',
    recommendedProductIds: ['blend-crema-barista', 'colombia-huila']
  };
}

export async function processSommelierQuery(
  question: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<SommelierResponse> {
  const localAnalysis = classifyQueryLocally(question);
  const gemini = getGeminiClient();

  // If Gemini API is available, generate full model response
  if (gemini) {
    try {
      const systemInstruction = buildSystemPrompt();

      // Format previous messages for conversation context
      const contents = [
        ...history.slice(-4).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        })),
        {
          role: 'user',
          parts: [{ text: question }]
        }
      ];

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out')), 5000)
      );

      const response = await Promise.race([
        gemini.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.4,
          }
        }),
        timeoutPromise
      ]);

      let rawText = response.text || '';
      
      // Extract metadata tag if appended: [SOURCE: ...] [CATEGORY: ...] [PRODUCTS: ...]
      let source: 'из базы' | 'из каталога' | 'общий' = localAnalysis.source;
      let category: string = localAnalysis.category;
      let productIds: string[] = [...localAnalysis.recommendedProductIds];

      const sourceMatch = rawText.match(/\[SOURCE:\s*(из базы|из каталога|общий)\]/i);
      if (sourceMatch) {
        source = sourceMatch[1].toLowerCase() as any;
      }

      const catMatch = rawText.match(/\[CATEGORY:\s*([^\]]+)\]/i);
      if (catMatch) {
        category = catMatch[1].trim();
      }

      const prodMatch = rawText.match(/\[PRODUCTS:\s*([^\]]+)\]/i);
      if (prodMatch) {
        const found = prodMatch[1].split(',').map(s => s.trim().toLowerCase());
        const validIds = CATALOG.filter(p => found.some(f => p.id.toLowerCase().includes(f) || p.name.toLowerCase().includes(f))).map(p => p.id);
        if (validIds.length > 0) {
          productIds = validIds;
        }
      }

      // Check if text mentions catalog products
      CATALOG.forEach(p => {
        if ((rawText.includes(p.name) || rawText.includes(p.country)) && !productIds.includes(p.id)) {
          productIds.push(p.id);
        }
      });

      // Strip technical metadata tags from output shown to user
      const cleanedContent = rawText
        .replace(/\[SOURCE:[^\]]+\]/gi, '')
        .replace(/\[CATEGORY:[^\]]+\]/gi, '')
        .replace(/\[PRODUCTS:[^\]]+\]/gi, '')
        .trim();

      const recommendedProducts = CATALOG.filter(p => productIds.includes(p.id)).slice(0, 3);
      if (recommendedProducts.length === 0 && localAnalysis.recommendedProductIds.length > 0) {
        recommendedProducts.push(...CATALOG.filter(p => localAnalysis.recommendedProductIds.includes(p.id)));
      }

      const followUps = generateFollowUps(category, recommendedProducts[0]);

      return {
        content: cleanedContent,
        category,
        source,
        recommendedProducts,
        suggestedFollowUps: followUps
      };
    } catch (err) {
      console.error('[GeminiService] Error calling Gemini API, falling back to knowledge base:', err);
    }
  }

  // Fallback response if Gemini not configured or on network issue
  const matchedAnswer = localAnalysis.matchedKbAnswer ||
    `Здравствуйте! Я с радостью помогу вам подобрать свежеобжаренный кофе, подходящий помол или кофейное оборудование. 
    
Уточните, пожалуйста:
1. Какой способ заваривания вы предпочитаете (воронка, турка, эспрессо, гейзер, френч-пресс)?
2. Какие вкусы вам нравятся больше: сочные фруктово-ягодные с кислинкой или классические плотные шоколадно-ореховые?`;

  const recommendedProducts = CATALOG.filter(p => localAnalysis.recommendedProductIds.includes(p.id)).slice(0, 3);
  const followUps = generateFollowUps(localAnalysis.category, recommendedProducts[0]);

  return {
    content: matchedAnswer,
    category: localAnalysis.category,
    source: localAnalysis.source,
    recommendedProducts,
    suggestedFollowUps: followUps
  };
}

function generateFollowUps(category: string, product?: ProductItem): string[] {
  if (product && product.category === 'Моносорт') {
    return [
      `Какой помол нужен для ${product.name}?`,
      'Сравнить с Бразилией Серрадо',
      'Как оформить регулярную подписку?'
    ];
  }

  switch (category) {
    case 'Помол':
      return [
        'Какой сорт лучше подойдёт под этот помол?',
        'Сколько хранится свежеобжаренный кофе?',
        'Как оформить подписку со скидкой 15%?'
      ];
    case 'Подписка':
      return [
        'Можно ли изменить интервал доставки?',
        'Какие сорта входят в подписку?',
        'Подобрать кофе с шоколадным вкусом'
      ];
    case 'Хранение':
      return [
        'Можно ли хранить кофе в морозилке?',
        'Посоветуйте свежеобжаренный кофе под воронку V60',
        'Какой помол нужен для турки?'
      ];
    case 'Оборудование':
      return [
        'Какие фильтры нужны для воронки Hario?',
        'Какое зерно посоветуете для турки?',
        'Условия доставки и оплаты'
      ];
    default:
      return [
        'Хочу кофе с высокой кислотностью и фруктами',
        'Люблю плотный шоколадный вкус без кислотности',
        'Сколько хранится свежеобжаренный кофе?'
      ];
  }
}
