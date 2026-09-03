/**
 * Persistence abstraction for the application.
 *
 * The frontend never writes directly to a database; it talks to a DataStore.
 * This lets the codebase run with local browser storage during development
 * and production, without depending on external proprietary backends.
 */

export interface StoredPlan {
  id: string;
  name: string;
  inputs: unknown;
  assumptions: unknown;
  riskAnswers: unknown;
  manualTargets: unknown | null;
  ipsState?: unknown;
  updatedAt: string;
}

export interface DataStore {
  /** Return a short identifier for this store implementation. */
  readonly name: string;

  /** Is this store currently available (authenticated, online, etc.)? */
  isAvailable(): boolean;

  /** List saved plans for the current user. */
  listPlans(): Promise<StoredPlan[]>;

  /** Load a single plan by id. */
  loadPlan(id: string): Promise<StoredPlan | null>;

  /** Save or overwrite a plan. */
  savePlan(plan: StoredPlan): Promise<{ success: boolean; error?: string }>;

  /** Delete a plan by id. */
  deletePlan(id: string): Promise<{ success: boolean; error?: string }>;
}
