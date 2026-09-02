import { errorResponse, jsonResponse, getUserIdFromToken, getPlanStore, planKey } from './_planUtils.js';

export default async (request) => {
  const token = request.headers.get('Authorization') || '';
  const userId = getUserIdFromToken(token);
  if (!userId) {
    return errorResponse('Authentication required', 401);
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const { id } = await request.json();
    if (!id) {
      return errorResponse('id is required', 400);
    }
    const store = getPlanStore();
    await store.delete(planKey(userId, id));
    return jsonResponse({ success: true });
  } catch (err) {
    console.error('plan-delete error:', err);
    return errorResponse('Failed to delete plan', 500);
  }
};
