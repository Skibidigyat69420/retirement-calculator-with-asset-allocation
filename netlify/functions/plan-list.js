import { errorResponse, jsonResponse, getUserIdFromToken, getPlanStore } from './_planUtils.js';

export default async (request) => {
  const token = request.headers.get('Authorization') || '';
  const userId = getUserIdFromToken(token);
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  try {
    const store = getPlanStore();
    const { blobs } = await store.list({ prefixes: [`${userId}:`] });
    const plans = [];
    for (const blob of blobs) {
      try {
        const raw = await store.get(blob.key, { type: 'text' });
        if (raw) plans.push(JSON.parse(raw));
      } catch {
        // skip corrupted entries
      }
    }
    return jsonResponse(plans.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)));
  } catch (err) {
    console.error('plan-list error:', err);
    return errorResponse('Failed to list plans', 500);
  }
};
