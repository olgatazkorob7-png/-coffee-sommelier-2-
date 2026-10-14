import { processSommelierQuery } from './geminiService';
import { sendQueryLog } from './loggerService';

export async function handleChatRequest(body: any) {
  const message = typeof body.message === 'string' ? body.message.trim() : (typeof body.question === 'string' ? body.question.trim() : '');
  const history = Array.isArray(body.history) ? body.history : [];

  if (!message) {
    return {
      status: 400,
      body: {
        error: 'Пожалуйста, введите ваш вопрос или выберите тему.'
      }
    };
  }

  // Generate response from sommelier
  const result = await processSommelierQuery(message, history);

  // Background asynchronous logging without waiting or blocking client
  sendQueryLog(message, result.category, result.source).catch(() => {});

  return {
    status: 200,
    body: result
  };
}

export async function handleLogRequest(body: any) {
  const message = body.message || body.question || '';
  const category = body.category || 'Общий';
  const source = body.source || 'общий';
  await sendQueryLog(message, category, source);
  return {
    status: 200,
    body: { success: true }
  };
}
