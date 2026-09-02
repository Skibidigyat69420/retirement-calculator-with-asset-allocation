import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { corsHeaders, errorResponse, handleOptions } from './_utils.js';

const PROJECT_ROOT = process.cwd();

export default async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const baseDir = resolve(PROJECT_ROOT, 'data', 'angel_one');
    if (!existsSync(baseDir)) {
      return errorResponse('No Angel One snapshot found. Run npm run fetch:angel:all first.', 404);
    }

    const entries = readdirSync(baseDir)
      .map((name) => ({ name, path: resolve(baseDir, name) }))
      .filter((entry) => statSync(entry.path).isDirectory())
      .sort((a, b) => statSync(b.path).mtimeMs - statSync(a.path).mtimeMs);

    if (entries.length === 0) {
      return errorResponse('No Angel One snapshot found. Run npm run fetch:angel:all first.', 404);
    }

    const latestDir = entries[0].path;
    const url = new URL(request.url);
    const file = url.searchParams.get('file') || 'snapshot.json';
    const filePath = resolve(latestDir, file);

    if (!filePath.startsWith(latestDir)) {
      return errorResponse('Invalid file path', 400);
    }

    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (file === 'snapshot.json' && data.files && typeof data.files === 'object') {
      for (const [key, relativePath] of Object.entries(data.files)) {
        if (typeof relativePath !== 'string' || relativePath.includes('/')) continue;
        try {
          const childPath = resolve(latestDir, relativePath);
          if (childPath.startsWith(latestDir) && existsSync(childPath)) {
            data.files[key] = readFileSync(childPath, 'utf8');
          }
        } catch {
          // Leave path as-is
        }
      }
    }

    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('Angel One snapshot API error:', err);
    return errorResponse('Failed to read Angel One snapshot', 500);
  }
};
