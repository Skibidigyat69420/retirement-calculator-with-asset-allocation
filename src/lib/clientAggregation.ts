import type { AdvisorAggregation, AssetCategory, ClientAggregationRow } from '../types';
import type { ClientSummary } from './api';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function numberValue(value: unknown): number {
  return Number(value ?? 0) || 0;
}

function toRow(client: ClientSummary): ClientAggregationRow {
  const summary = client.financialSummary ?? ({} as ClientSummary['financialSummary']);
  const totalAssets = numberValue(summary.totalAssets);
  const liabilities = numberValue(summary.totalLiabilities);
  return {
    clientId: String(client.id ?? ''),
    name: String(client.name ?? 'Client'),
    aum: numberValue(summary.investableAssets) || totalAssets,
    liabilities,
    netWorth: numberValue(summary.netWorth) || totalAssets - liabilities,
    assetCount: Math.max(0, Math.round(numberValue(summary.assetCount))),
  };
}

/**
 * Roll up an advisor's book from list-clients DTOs. The DTO carries a
 * financial summary but no per-category breakdown, so `byCategory` aggregates
 * the optional `financialSummary.byCategory` extension when the backend sends
 * it and stays zero otherwise. `householdCount` groups on `householdId` and
 * falls back to the client count when the field is absent.
 */
export function aggregateClients(clients: ClientSummary[]): AdvisorAggregation {
  const safe = Array.isArray(clients) ? clients : [];
  const byClient = safe.map(toRow);

  const householdIds = new Set(
    safe
      .map((client) => (typeof client.householdId === 'string' && client.householdId ? client.householdId : null))
      .filter((id): id is string => id !== null),
  );

  const byCategory = CATEGORIES.reduce<Record<AssetCategory, number>>((acc, category) => {
    acc[category] = round2(
      safe.reduce((sum, client) => sum + numberValue(client.financialSummary?.byCategory?.[category]), 0),
    );
    return acc;
  }, { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 });

  return {
    clientCount: byClient.length,
    householdCount: householdIds.size > 0 ? householdIds.size : byClient.length,
    totalAUM: round2(byClient.reduce((sum, row) => sum + row.aum, 0)),
    totalLiabilities: round2(byClient.reduce((sum, row) => sum + row.liabilities, 0)),
    totalNetWorth: round2(byClient.reduce((sum, row) => sum + row.netWorth, 0)),
    byCategory,
    byClient,
    topClientsByAUM: [...byClient]
      .sort((a, b) => b.aum - a.aum || a.name.localeCompare(b.name))
      .slice(0, 5),
  };
}
