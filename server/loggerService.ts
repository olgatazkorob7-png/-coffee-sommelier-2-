export async function sendQueryLog(
  question: string,
  category: string,
  source: string
): Promise<void> {
  const logUrl = process.env.LOG_URL;
  if (!logUrl) return;

  try {
    await fetch(logUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'log',
        question,
        category,
        source,
      }),
    });
  } catch (err) {
    console.error('Log failed:', err);
  }
}

export const logToSheets = sendQueryLog;
