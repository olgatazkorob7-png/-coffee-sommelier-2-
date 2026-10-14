import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { 
  buildSystemPrompt, 
  CATALOG, 
  classifyQueryLocally, 
  generateFollowUps,
  ProductItem 
} from '@/lib/coffee-data';
import { sendQueryLog } from '@/server/loggerService';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' 
      ? body.message.trim() 
      : (typeof body.question === 'string' ? body.question.trim() : '');
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: 'Вопрос не указан' }, { status: 400 });
    }

    const localAnalysis = classifyQueryLocally(message);
    const gemini = getGeminiClient();

    let content = localAnalysis.matchedKbAnswer || '';
    let category = localAnalysis.category;
    let source: 'из базы' | 'из каталога' | 'общий' = localAnalysis.source;
    let productIds: string[] = [...localAnalysis.recommendedProductIds];

    if (gemini) {
      try {
        const systemInstruction = buildSystemPrompt();
        const contents = [
          ...history.slice(-4).map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
          {
            role: 'user',
            parts: [{ text: message }]
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

        const rawText = response.text || '';

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
          const found = prodMatch[1].split(',').map((s: string) => s.trim().toLowerCase());
          const validIds = CATALOG.filter(p => found.some(f => p.id.toLowerCase().includes(f) || p.name.toLowerCase().includes(f))).map(p => p.id);
          if (validIds.length > 0) {
            productIds = validIds;
          }
        }

        CATALOG.forEach(p => {
          if ((rawText.includes(p.name) || rawText.includes(p.country)) && !productIds.includes(p.id)) {
            productIds.push(p.id);
          }
        });

        const cleanedContent = rawText
          .replace(/\[SOURCE:[^\]]+\]/gi, '')
          .replace(/\[CATEGORY:[^\]]+\]/gi, '')
          .replace(/\[PRODUCTS:[^\]]+\]/gi, '')
          .trim();

        if (cleanedContent) {
          content = cleanedContent;
        }
      } catch (geminiError) {
        console.warn('[Gemini Error, using local fallback]:', geminiError);
      }
    }

    if (!content) {
      content = `Здравствуйте! Я с радостью помогу вам подобрать свежеобжаренный кофе, подходящий помол или кофейное оборудование. 
    
Уточните, пожалуйста:
1. Какой способ заваривания вы предпочитаете (воронка, турка, эспрессо, гейзер, френч-пресс)?
2. Какие вкусы вам нравятся больше: сочные фруктово-ягодные с кислинкой или классические плотные шоколадно-ореховые?`;
    }

    const recommendedProducts = CATALOG.filter(p => productIds.includes(p.id)).slice(0, 3);
    if (recommendedProducts.length === 0 && localAnalysis.recommendedProductIds.length > 0) {
      recommendedProducts.push(...CATALOG.filter(p => localAnalysis.recommendedProductIds.includes(p.id)));
    }

    const suggestedFollowUps = generateFollowUps(category, recommendedProducts[0]);

    // Асинхронный вызов логирования без await
    sendQueryLog(message, category, source).catch(() => {});

        const firstProduct = recommendedProducts.length > 0
      ? {
          name: recommendedProducts[0].name,
          country: recommendedProducts[0].country,
          flavorProfile: recommendedProducts[0].flavorProfile,
          whyFits: recommendedProducts[0].whyFits || 'Подобрано по Вашему запросу.',
          price: recommendedProducts[0].price,
          link: recommendedProducts[0].link,
        }
      : null;

    return NextResponse.json({
      reply: content,
      recommendedProduct: firstProduct,
      // Дополнительно оставляем для совместимости:
      content,
      category,
      source,
      recommendedProducts,
      suggestedFollowUps,
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
