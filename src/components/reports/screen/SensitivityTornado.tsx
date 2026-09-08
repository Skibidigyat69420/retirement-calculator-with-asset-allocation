import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { Wind } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { CHART_TOOLTIP_STYLE, CHART_TICK, CHART_GRID_STROKE, TOKEN } from './chartTheme';
import { formatCurrency, formatCurrencyCompact } from '../../../lib/formatters';
import type { MasterPlanInputs } from '../../../types';
import type { WealthEngineResult } from '../../../lib/wealthEngine';

interface SensitivityTornadoProps {
  inputs: MasterPlanInputs;
  wealthResult: WealthEngineResult;
}

interface TornadoRow {
  label: string;
  range: [number, number];
  surplus: number;
  impact: number;
}

/**
 * Replicates the funding math used by the Retirement Sensitivity Matrix
 * (annuity requirement vs projected corpus) and perturbs one factor at a
 * time to rank drivers of plan surplus — a classic tornado chart.
 */
export const SensitivityTornado = ({ inputs, wealthResult }: SensitivityTornadoProps) => {
  const { rows, baseSurplus } = useMemo<{ rows: TornadoRow[]; baseSurplus: number }>(() => {
    const { currentAge, lifeExpectancy } = inputs;

    const requiredCorpus = (
      monthlyToday: number,
      retAge: number,
      inflationPct: number,
      postRetPct: number,
    ): number => {
      const yearsToRet = Math.max(0, retAge - currentAge);
      const distYears = Math.max(1, lifeExpectancy - retAge);
      const infl = inflationPct / 100;
      const postRet = postRetPct / 100;
      const realReturn = (1 + postRet) / (1 + infl) - 1;
      const taxFactor = 1 - inputs.swp.taxRate / 100;
      const monthlyAtRet = monthlyToday * Math.pow(1 + infl, yearsToRet);
      const annualGross = (monthlyAtRet * 12) / taxFactor;
      if (realReturn > 0) {
        return (annualGross * (1 - Math.pow(1 + realReturn, -distYears))) / realReturn;
      }
      return annualGross * distYears;
    };

    const projectedCorpus = (retAge: number, growthRate = 0.08): number => {
      const snap = wealthResult.snapshots.find((s) => s.age === retAge);
      if (snap) return snap.total;
      const yearsToRet = Math.max(0, retAge - currentAge);
      return (
        wealthResult.netWorth * Math.pow(1 + growthRate, yearsToRet) +
        (inputs.sip.amount * 12 * (Math.pow(1 + growthRate, yearsToRet) - 1)) / growthRate
      );
    };

    const baseRetAge = inputs.retirementAge;
    const baseMonthly = inputs.swp.monthlyNeedToday;
    const baseInfl = inputs.inflation;
    const basePostRet = inputs.swp.postRetirementReturn;

    const baseRequired = requiredCorpus(baseMonthly, baseRetAge, baseInfl, basePostRet);
    const baseProjected = projectedCorpus(baseRetAge);
    const baseSurplus = baseProjected - baseRequired;

    const earlyAge = Math.max(currentAge + 1, baseRetAge - 3);

    const variants: { label: string; surplus: number }[] = [
      {
        label: baseRetAge - earlyAge === 3 ? 'Retire 3y earlier' : `Retire at age ${earlyAge}`,
        surplus: projectedCorpus(earlyAge) - requiredCorpus(baseMonthly, earlyAge, baseInfl, basePostRet),
      },
      {
        label: `Retire 5y later (age ${baseRetAge + 5})`,
        surplus:
          projectedCorpus(baseRetAge + 5) -
          requiredCorpus(baseMonthly, baseRetAge + 5, baseInfl, basePostRet),
      },
      { label: 'Spending +15%', surplus: baseProjected - requiredCorpus(baseMonthly * 1.15, baseRetAge, baseInfl, basePostRet) },
      { label: 'Spending −10%', surplus: baseProjected - requiredCorpus(baseMonthly * 0.9, baseRetAge, baseInfl, basePostRet) },
      { label: 'Post-ret return +1pp', surplus: baseProjected - requiredCorpus(baseMonthly, baseRetAge, baseInfl, basePostRet + 1) },
      { label: 'Post-ret return −1pp', surplus: baseProjected - requiredCorpus(baseMonthly, baseRetAge, baseInfl, basePostRet - 1) },
      { label: 'Inflation +1pp', surplus: baseProjected - requiredCorpus(baseMonthly, baseRetAge, baseInfl + 1, basePostRet) },
      { label: 'Inflation −1pp', surplus: baseProjected - requiredCorpus(baseMonthly, baseRetAge, baseInfl - 1, basePostRet) },
    ];

    return {
      baseSurplus,
      rows: variants
        .map((v) => ({
          label: v.label,
          range: [Math.min(baseSurplus, v.surplus), Math.max(baseSurplus, v.surplus)] as [number, number],
          surplus: v.surplus,
          impact: v.surplus - baseSurplus,
        }))
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    };
  }, [inputs, wealthResult]);

  const dominant = rows[0];
  const worst = rows.reduce((w, r) => (r.impact < w.impact ? r : w), rows[0]);

  const caption =
    rows.length > 0 && dominant && worst
      ? `Retirement timing dominates: ${dominant.label} moves the plan surplus by ${formatCurrencyCompact(Math.abs(dominant.impact))}; the most damaging single change is ${worst.label} (${formatCurrencyCompact(worst.impact)}). Base-case surplus is ${formatCurrencyCompact(baseSurplus)}.`
      : 'No sensitivity data available.';

  const summary = `Retirement sensitivity tornado around a base-case surplus of ${formatCurrency(baseSurplus)}. ${rows
    .map((r) => `${r.label}: surplus ${formatCurrency(r.surplus)}, impact ${formatCurrency(r.impact)}`)
    .join('. ')}.`;

  return (
    <ChartFrame
      title="Retirement Sensitivity — Tornado"
      icon={<Wind size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View sensitivity table"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Factor</th>
              <th className="py-2.5 pr-4 text-right">Surplus After Change</th>
              <th className="py-2.5 pr-4 text-right">Impact vs Base</th>
            </>
          }
        >
          <tr>
            <td className="py-2 pr-4 font-semibold text-ink">Base plan (no change)</td>
            <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(baseSurplus)}</td>
            <td className="py-2 pr-4 text-right font-mono text-muted">—</td>
          </tr>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className="py-2 pr-4 text-muted">{row.label}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(row.surplus)}</td>
              <td className={`py-2 pr-4 text-right font-mono ${row.impact >= 0 ? 'text-positive' : 'text-negative'}`}>
                {row.impact >= 0 ? '+' : ''}
                {formatCurrency(row.impact)}
              </td>
            </tr>
          ))}
        </DetailTable>
      }
    >
      <div className="h-80 w-full" role="img" aria-label={`Tornado chart ranking factors by impact on retirement plan surplus around a base of ${formatCurrencyCompact(baseSurplus)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
            <XAxis type="number" tickFormatter={formatCurrencyCompact} tick={CHART_TICK} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" tick={CHART_TICK} axisLine={false} tickLine={false} width={150} />
            <Tooltip
              cursor={{ fill: 'rgba(139, 149, 165, 0.06)' }}
              formatter={(value: any, _name: any, item: any) => {
                const row = item?.payload as TornadoRow | undefined;
                if (!row) return [String(value), 'Surplus range'];
                return [`${formatCurrencyCompact(row.range[0])} → ${formatCurrencyCompact(row.range[1])}`, row.label];
              }}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <ReferenceLine
              x={baseSurplus}
              stroke={TOKEN.ink}
              strokeDasharray="4 3"
              label={{ value: 'Base', position: 'top', fontSize: 10, fill: TOKEN.ink }}
            />
            <Bar dataKey="range" isAnimationActive={false} radius={3}>
              {rows.map((row) => (
                <Cell
                  key={row.label}
                  fill={row.impact >= 0 ? TOKEN.accent : TOKEN.negative}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-faint mt-2">
        Each bar spans the base-case surplus to the surplus under that single-factor change; green bars improve funding, rose bars erode it.
      </p>
    </ChartFrame>
  );
};
