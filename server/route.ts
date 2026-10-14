import { processSommelierQuery } from './geminiService';
import { sendQueryLog } from './loggerService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : (typeof body.question === 'string' ? body.question.trim() : '');
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return new Response(JSON.stringify({ error: 'Вопрос не указан' }), { status: 400 });
    }

    // Обработка запроса сомелье
    const result = await processSommelierQuery(message, history);

    // Асинхронное логирование в Google Sheets без await
    sendQueryLog(message, result.category, result.source).catch(() => {});

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Ошибка сервера' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
