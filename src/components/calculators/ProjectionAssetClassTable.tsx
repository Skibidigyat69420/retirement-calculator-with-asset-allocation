import { Plus, Trash2, Globe } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  type ProjectableAssetClass,
  SUPPORTED_CURRENCIES,
} from '../../lib/portfolioProjection';

interface ProjectionAssetClassTableProps {
  assetClasses: ProjectableAssetClass[];
  effectiveAssetReturns: {
    id: string;
    name: string;
    localReturn: number;
    currency: string;
    fxRate: number;
    effectiveInrReturn: number;
    realReturn: number;
  }[];
  totalWeight: number;
  isWeight100: boolean;
  inflationRate: number;
  onUpdateClass: (id: string, updates: Partial<ProjectableAssetClass>) => void;
  onAddClass: () => void;
  onRemoveClass: (id: string) => void;
  onNormalizeWeights: () => void;
}

export const ProjectionAssetClassTable = ({
  assetClasses,
  effectiveAssetReturns,
  totalWeight,
  isWeight100,
  inflationRate,
  onUpdateClass,
  onAddClass,
  onRemoveClass,
  onNormalizeWeights,
}: ProjectionAssetClassTableProps) => {
  return (
    <div className="rounded-lg border border-border bg-raised">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="eyebrow">Asset Classes & Currency Modeling</div>
          <Badge tone={isWeight100 ? 'positive' : 'warning'} dot={false}>
            Total Weight: {totalWeight.toFixed(1)}%
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {!isWeight100 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onNormalizeWeights}
              className="text-xs h-8"
            >
              Auto-Normalize to 100%
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onAddClass}
            className="text-xs h-8 gap-1"
          >
            <Plus size={13} strokeWidth={1.8} />
            Add Class
          </Button>
        </div>
      </div>

      {/* Asset Class Rows */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-border text-muted uppercase tracking-wider text-[10px]">
              <th className="py-2.5 pl-5 pr-2 font-semibold">Asset Class Name</th>
              <th className="py-2.5 px-2 w-20 text-right font-semibold">Weight %</th>
              <th className="py-2.5 px-2 w-24 text-right font-semibold">Local Return</th>
              <th className="py-2.5 px-2 w-28 font-semibold">Currency</th>
              <th className="py-2.5 px-2 w-24 text-right font-semibold">FX Drift %</th>
              <th className="py-2.5 px-2 text-right font-semibold">Effective INR</th>
              <th className="py-2.5 px-2 text-right font-semibold">Real Return</th>
              <th className="py-2.5 pr-5 pl-2 w-10 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {assetClasses.map((ac, idx) => {
              const eff = effectiveAssetReturns[idx];

              return (
                <tr key={ac.id} className="hover:bg-sunken/50 transition-colors">
                  {/* Name */}
                  <td className="py-2.5 pl-5 pr-2">
                    <input
                      type="text"
                      value={ac.name}
                      onChange={(e) => onUpdateClass(ac.id, { name: e.target.value })}
                      aria-label={`Asset class name ${idx + 1}`}
                      className="w-full font-semibold text-sm text-ink bg-transparent border-b border-transparent hover:border-border-strong focus:border-accent focus:outline-none transition-colors"
                    />
                  </td>

                  {/* Weight */}
                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      aria-label={`Weight percentage for ${ac.name}`}
                      value={ac.weight}
                      onChange={(e) =>
                        onUpdateClass(ac.id, { weight: parseFloat(e.target.value) || 0 })
                      }
                      step={1}
                      min={0}
                      max={100}
                      className="w-16 text-right font-mono tabular-nums text-sm text-ink bg-surface border border-border rounded-sm px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
                    />
                  </td>

                  {/* Local Return */}
                  <td className="py-2.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <input
                        type="number"
                        aria-label={`Expected local return for ${ac.name}`}
                        value={ac.returnRate}
                        onChange={(e) =>
                          onUpdateClass(ac.id, {
                            returnRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        step={0.5}
                        className="w-16 text-right font-mono tabular-nums text-sm text-ink bg-surface border border-border rounded-sm px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
                      />
                      <span className="text-muted">%</span>
                    </div>
                  </td>

                  {/* Currency */}
                  <td className="py-2.5 px-2">
                    <select
                      aria-label={`Currency for ${ac.name}`}
                      value={ac.currency}
                      onChange={(e) => onUpdateClass(ac.id, { currency: e.target.value })}
                      className="w-full font-semibold text-xs text-ink-soft bg-surface border border-border rounded-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent"
                    >
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.code} ({c.symbol})
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* FX Drift Rate */}
                  <td className="py-2.5 px-2 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <input
                        type="number"
                        aria-label={`FX drift rate for ${ac.name}`}
                        value={ac.fxRate}
                        onChange={(e) =>
                          onUpdateClass(ac.id, {
                            fxRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        step={0.5}
                        disabled={ac.currency === 'INR'}
                        className={`w-16 text-right font-mono tabular-nums text-sm text-ink bg-surface border border-border rounded-sm px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-accent-soft focus:border-accent ${
                          ac.currency === 'INR' ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                      />
                      <span className="text-muted">%</span>
                    </div>
                  </td>

                  {/* Effective INR Return */}
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-sm text-ink">
                    {eff ? `${eff.effectiveInrReturn.toFixed(1)}%` : '—'}
                  </td>

                  {/* Real Return */}
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-sm text-positive">
                    {eff ? `${eff.realReturn.toFixed(1)}%` : '—'}
                  </td>

                  {/* Action Delete */}
                  <td className="py-2.5 pr-5 pl-2 text-center">
                    {assetClasses.length > 1 && (
                      <button
                        onClick={() => onRemoveClass(ac.id)}
                        aria-label={`Delete ${ac.name} asset class`}
                        className="text-faint hover:text-negative transition-colors p-1 cursor-pointer"
                        title="Delete asset class"
                        type="button"
                      >
                        <Trash2 size={14} strokeWidth={1.6} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mx-5 mb-5 p-3 bg-sunken/60 rounded-md text-xs text-muted flex items-start gap-2">
        <Globe size={15} strokeWidth={1.6} className="text-accent-strong mt-0.5 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold text-ink-soft">Currency compounding note:</span> foreign assets (e.g. US
          equities in USD) automatically compound at their local return plus foreign currency appreciation against the
          Indian rupee:{' '}
          <code className="text-accent-strong font-mono">(1 + r_local) × (1 + r_fx) − 1</code>. Real returns are
          further deflated by domestic inflation ({inflationRate}%).
        </div>
      </div>
    </div>
  );
};
