import { useState } from 'react';
import { Percent, Grid3X3 } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { Button } from '../components/ui/Button';
import { formatPercent } from '../lib/formatters';

export const SWR = () => {
  const [corpus, setCorpus] = useState(50000000);
  const [years, setYears] = useState(30);
  const [returnMean, setReturnMean] = useState(9);
  const [volatility, setVolatility] = useState(12);
  const [inflation, setInflation] = useState(5);
  const [simulations, setSimulations] = useState(500);
  const [grid, setGrid] = useState<{ rate: number; successRate: number }[]>([]);

  const runGrid = () => {
    const rates = [2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
    const results = rates.map((rate) => {
      let successes = 0;
      for (let s = 0; s < simulations; s++) {
        let remaining = corpus;
        let withdrawal = (corpus * rate) / 100;
        let success = true;
        for (let y = 0; y < years; y++) {
          const annualReturn = (returnMean / 100) + (Math.random() * 2 - 1) * (volatility / 100);
          remaining = (remaining - withdrawal) * (1 + annualReturn);
          withdrawal *= 1 + inflation / 100;
          if (remaining <= 0) {
            success = false;
            break;
          }
        }
        if (success) successes++;
      }
      return { rate, successRate: successes / simulations };
    });
    setGrid(results);
  };

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Safe Withdrawal Rate (SWR) Matrix"
        subtitle="Trinity-study style grid: probability of portfolio survival across withdrawal rates and market assumptions."
        badge="Retirement Lab"
      />

      <Card className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberInput label="Corpus" value={corpus} onChange={setCorpus} />
          <NumberInput label="Withdrawal Years" value={years} onChange={setYears} />
          <NumberInput label="Return Mean" value={returnMean} onChange={setReturnMean} suffix="%" />
          <NumberInput label="Volatility" value={volatility} onChange={setVolatility} suffix="%" />
          <NumberInput label="Inflation" value={inflation} onChange={setInflation} suffix="%" />
          <NumberInput label="Simulations" value={simulations} onChange={setSimulations} />
        </div>
        <Button onClick={runGrid} className="w-full">
          <Grid3X3 size={16} className="mr-1.5" /> Run SWR Matrix
        </Button>
      </Card>

      {grid.length > 0 && (
        <Card>
          <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
            <Percent size={18} className="text-gold" /> Survival Probability by Withdrawal Rate
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {grid.map((g) => (
              <div
                key={g.rate}
                className={`p-4 rounded-xl border text-center ${
                  g.successRate >= 0.9
                    ? 'bg-emerald-50 border-emerald-200'
                    : g.successRate >= 0.7
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-rose-50 border-rose-200'
                }`}
              >
                <div className="text-2xl font-serif font-bold text-navy">{g.rate}%</div>
                <div className={`text-sm font-medium ${g.successRate >= 0.9 ? 'text-emerald-700' : g.successRate >= 0.7 ? 'text-amber-700' : 'text-rose-700'}`}>
                  {formatPercent(g.successRate * 100)}
                </div>
                <div className="text-[10px] text-stone-400 uppercase tracking-wider mt-1">Survival</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
