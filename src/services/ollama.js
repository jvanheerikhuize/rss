import config from '../config.js';
import logger from '../utils/logger.js';

export async function generate(prompt) {
  const { ollama_url, model } = config.ai;

  let response;
  try {
    response = await fetch(`${ollama_url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    logger.warn({ err: err.message }, 'Ollama connection failed');
    throw new Error(`Cannot connect to Ollama at ${ollama_url}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama error ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.response;
}
