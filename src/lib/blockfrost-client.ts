import { getBlockfrostConfig } from '@/lib/blockfrost-config';
import { logger } from '@/lib/logger';

const DEFAULT_MAX_RETRIES = 5;

export async function blockfrostFetch<T>(path: string, retries = DEFAULT_MAX_RETRIES): Promise<T> {
  const { baseUrl, projectId } = getBlockfrostConfig();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { project_id: projectId },
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.pow(2, attempt) * 1000;
      logger.warn('[BlockfrostClient]', `Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }

    if (!response.ok) {
      throw new Error(`Blockfrost error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  throw new Error(`Blockfrost request failed after ${retries} retries`);
}
