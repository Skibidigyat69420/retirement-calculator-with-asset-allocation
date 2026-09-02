import { errorResponse, jsonResponse, getUserIdFromToken, getPlanStore, planKey } from './_planUtils.js';

export default async (request) => {
  const token = request.headers.get('Authorization') || '';
  const userId = getUserIdFromToken(token);
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return errorResponse('id is required', 400);
  }

  try {
    const store = getPlanStore();
    const raw = await store.get(planKey(userId, id), { type: 'text' });
    if (!raw) {
      return errorResponse('Plan not found', 404);
    }
    return jsonResponse(JSON.parse(raw));
  } catch (err) {
    console.error('plan-load error:', err);
    return errorResponse('Failed to load plan', 500);
  }
};
