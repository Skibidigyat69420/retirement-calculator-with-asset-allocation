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
    const plan = await request.json();
    if (!plan || !plan.id) {
      return errorResponse('Plan id is required', 400);
    }

    const store = getPlanStore();
    const payload = {
      ...plan,
      userId,
      updatedAt: new Date().toISOString(),
    };
    await store.set(planKey(userId, plan.id), JSON.stringify(payload));
    return jsonResponse({ success: true, id: plan.id });
  } catch (err) {
    console.error('plan-save error:', err);
    return errorResponse('Failed to save plan', 500);
  }
};
