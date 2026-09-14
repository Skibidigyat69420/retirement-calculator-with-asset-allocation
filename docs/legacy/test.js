        function formatCurrency(amount) {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
            }).format(amount);
        }

let chartInstance = null;

        function calculateRetirement() {
            // Retrieve values
            const currentAge = Number(document.getElementById('currentAge').value);
            const retirementAge = Number(document.getElementById('retirementAge').value);
            const lifeExpectancy = Number(document.getElementById('lifeExpectancy').value);
            const currentCorpus = Number(document.getElementById('currentCorpus').value);
            const monthlyInvestment = Number(document.getElementById('monthlyInvestment').value);
            const expectedReturnPreRetirementPct = Number(document.getElementById('expectedReturnPreRetirementPct').value);
            const currentMonthlyExpenses = Number(document.getElementById('currentMonthlyExpenses').value);
            const inflationPct = Number(document.getElementById('inflationPct').value);
            const currencyDepreciationPct = Number(document.getElementById('currencyDepreciationPct').value);
            const expectedReturnPostRetirementPct = Number(document.getElementById('expectedReturnPostRetirementPct').value);
            const swpTaxRatePct = Number(document.getElementById('swpTaxRatePct').value);

            const projections = [];
            
            const effectiveInflationRate = (1 + inflationPct / 100) * (1 + currencyDepreciationPct / 100) - 1;
            const preRetirementReturnRate = expectedReturnPreRetirementPct / 100;
            const postRetirementReturnRate = expectedReturnPostRetirementPct / 100;
            
            let currentCorpusBalance = currentCorpus;
            let currentAnnualExpenses = currentMonthlyExpenses * 12;
            
            let corpusAtRetirement = 0;
            let requiredCorpusAtRetirement = 0;
            let sustainableUntilAge = lifeExpectancy;
            let isSustainable = true;

            for (let age = currentAge; age <= lifeExpectancy; age++) {
                const isRetired = age >= retirementAge;
                const corpusStart = currentCorpusBalance;
                
                let annualInvestment = 0;
                let annualExpensesThisYear = 0;
                let annualReturns = 0;
                let annualTaxes = 0;

                if (!isRetired) {
                    annualInvestment = monthlyInvestment * 12;
                    annualReturns = (corpusStart + annualInvestment / 2) * preRetirementReturnRate;
                    currentCorpusBalance = corpusStart + annualInvestment + annualReturns;
                } else {
                    if (age === retirementAge) {
                        corpusAtRetirement = corpusStart;
                        const effectiveRealReturn = (1 + postRetirementReturnRate * (1 - swpTaxRatePct / 100)) / (1 + effectiveInflationRate) - 1;
                        const yearsInRetirement = lifeExpectancy - retirementAge + 1;
                        
                        if (Math.abs(effectiveRealReturn) < 0.0001) {
                            requiredCorpusAtRetirement = currentAnnualExpenses * yearsInRetirement;
                        } else {
                            requiredCorpusAtRetirement = currentAnnualExpenses * (1 - Math.pow(1 + effectiveRealReturn, -yearsInRetirement)) / effectiveRealReturn;
                        }
                    }

                    annualExpensesThisYear = currentAnnualExpenses;
                    annualTaxes = annualExpensesThisYear * (swpTaxRatePct / 100); 
                    const totalWithdrawal = annualExpensesThisYear + annualTaxes;

                    if (corpusStart > 0) {
                        annualReturns = (corpusStart - totalWithdrawal / 2) * postRetirementReturnRate;
                        currentCorpusBalance = corpusStart - totalWithdrawal + annualReturns;
                    } else {
                        annualReturns = 0;
                        currentCorpusBalance = corpusStart - totalWithdrawal;
                    }

                    if (currentCorpusBalance < 0 && isSustainable) {
                        isSustainable = false;
                        sustainableUntilAge = age;
                    }
                }

                projections.push({
                    age,
                    isRetired,
                    corpusStart,
                    annualInvestment,
                    annualExpenses: annualExpensesThisYear,
                    annualReturns,
                    annualTaxes,
                    corpusEnd: Math.max(0, currentCorpusBalance)
                });

                currentAnnualExpenses = currentAnnualExpenses * (1 + effectiveInflationRate);
            }

            return {
                projections,
                corpusAtRetirement,
                requiredCorpusAtRetirement,
                shortfallOrSurplus: corpusAtRetirement - requiredCorpusAtRetirement,
                isSustainable,
                sustainableUntilAge,
                currentAge,
                retirementAge,
                lifeExpectancy
            };
        }

        function updateUI() {
            const res = calculateRetirement();

            // Update Labels
            document.getElementById('lblRetirementAge').innerText = res.retirementAge;
            document.getElementById('lblRetirementAge2').innerText = res.retirementAge;
            document.getElementById('projectedCorpus').innerText = formatCurrency(res.corpusAtRetirement);
            document.getElementById('requiredCorpus').innerText = formatCurrency(res.requiredCorpusAtRetirement);

            // Update Verdict
            const banner = document.getElementById('verdictBanner');
            const title = document.getElementById('verdictTitle');
            const subtitle = document.getElementById('verdictSubtitle');

            if (res.isSustainable) {
                banner.className = "p-6 rounded-lg shadow flex items-center justify-between bg-green-50 border border-green-200";
                title.className = "text-xl font-bold text-green-800";
                title.innerText = "You are on track!";
                subtitle.className = "mt-1 text-sm text-green-700";
                subtitle.innerText = `Your corpus will last beyond age ${res.lifeExpectancy}. Surplus: ${formatCurrency(res.shortfallOrSurplus)}`;
            } else {
                banner.className = "p-6 rounded-lg shadow flex items-center justify-between bg-red-50 border border-red-200";
                title.className = "text-xl font-bold text-red-800";
                title.innerText = "Shortfall Detected";
                subtitle.className = "mt-1 text-sm text-red-700";
                subtitle.innerText = `Your corpus will run out at age ${res.sustainableUntilAge}. Shortfall: ${formatCurrency(Math.abs(res.shortfallOrSurplus))}`;
            }

            // Update Ledger
            const tbody = document.getElementById('ledgerBody');
            tbody.innerHTML = '';
            
            const milestones = res.projections.filter(p => 
                p.age === res.currentAge || 
                p.age === res.retirementAge || 
                p.age === res.lifeExpectancy || 
                (p.age === res.sustainableUntilAge && !res.isSustainable)
            );

            milestones.forEach(p => {
                const tr = document.createElement('tr');
                if (p.age === res.retirementAge) tr.className = 'bg-indigo-50';
                
                let status = 'End of Plan';
                if (p.age === res.currentAge) status = 'Today';
                else if (p.age === res.retirementAge) status = 'Retirement';
                else if (p.age === res.sustainableUntilAge && !res.isSustainable) status = 'Funds Depleted';

                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${p.age}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${status}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">${formatCurrency(p.corpusStart)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">${formatCurrency(p.annualExpenses)}</td>
                `;
                tbody.appendChild(tr);
            });

            // Update Chart
            const labels = res.projections.map(p => p.age);
            const corpusData = res.projections.map(p => p.corpusEnd);

            if (chartInstance) {
                chartInstance.data.labels = labels;
                chartInstance.data.datasets[0].data = corpusData;
                chartInstance.update();
            } else {
                const ctx = document.getElementById('corpusChart').getContext('2d');
                chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Corpus Balance',
                            data: corpusData,
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            pointRadius: 0,
                            pointHoverRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            mode: 'index',
                            intersect: false,
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.parsed.y !== null) {
                                            label += formatCurrency(context.parsed.y);
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }

        // Add event listeners to all inputs
        // Initialize Retirement listeners manually here
        document.querySelectorAll('#calculator-form input').forEach(input => {
            input.addEventListener('input', updateUI);
        });



        // --- Global Charts ---
        let sipChartObj = null;
        let lumpsumChartObj = null;
        let allocationChartObj = null;

        // --- SIP Calculator ---
        function calculateSIP() {
            const P = Number(document.getElementById('sipAmount').value);
            const r = Number(document.getElementById('sipReturn').value) / 100 / 12;
            const years = Number(document.getElementById('sipYears').value);
            const n = years * 12;

            let invested = P * n;
            let maturity = 0;
            if(r === 0) maturity = invested;
            else maturity = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
            
            document.getElementById('sipInvested').innerText = formatCurrency(invested);
            document.getElementById('sipEstReturns').innerText = formatCurrency(maturity - invested);
            document.getElementById('sipTotal').innerText = formatCurrency(maturity);

            // Chart Data
            const labels = [];
            const investedData = [];
            const maturityData = [];
            
            for(let y = 0; y <= years; y++) {
                labels.push('Year ' + y);
                const m = y * 12;
                investedData.push(P * m);
                if(r === 0) maturityData.push(P * m);
                else maturityData.push(P * ((Math.pow(1 + r, m) - 1) / r) * (1 + r) || 0);
            }

            renderChart('sipChart', labels, [
                { label: 'Invested Amount', data: investedData, borderColor: '#9ca3af', backgroundColor: 'rgba(156, 163, 175, 0.2)', fill: true },
                { label: 'Total Value', data: maturityData, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.1)', fill: true }
            ], sipChartObj, (newChart) => sipChartObj = newChart);
        }

        // --- Lumpsum Calculator ---
        function calculateLumpsum() {
            const P = Number(document.getElementById('lumpsumAmount').value);
            const r = Number(document.getElementById('lumpsumReturn').value) / 100;
            const years = Number(document.getElementById('lumpsumYears').value);

            let maturity = P * Math.pow(1 + r, years);
            
            document.getElementById('lumpsumInvested').innerText = formatCurrency(P);
            document.getElementById('lumpsumEstReturns').innerText = formatCurrency(maturity - P);
            document.getElementById('lumpsumTotal').innerText = formatCurrency(maturity);

            // Chart Data
            const labels = [];
            const investedData = [];
            const maturityData = [];
            
            for(let y = 0; y <= years; y++) {
                labels.push('Year ' + y);
                investedData.push(P);
                maturityData.push(P * Math.pow(1 + r, y));
            }

            renderChart('lumpsumChart', labels, [
                { label: 'Invested Amount', data: investedData, borderColor: '#9ca3af', backgroundColor: 'rgba(156, 163, 175, 0.2)', fill: true },
                { label: 'Total Value', data: maturityData, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true }
            ], lumpsumChartObj, (newChart) => lumpsumChartObj = newChart);
        }

        
        let goalChartObj = null;

        function calculateGoal() {
            const FV = Number(document.getElementById('goalTarget').value);
            const rAnnual = Number(document.getElementById('goalReturn').value) / 100;
            const years = Number(document.getElementById('goalYears').value);
            const goalType = document.querySelector('input[name="goalType"]:checked').value;

            let requiredValue = 0;
            let totalInvested = 0;

            const labels = [];
            const investedData = [];
            const corpusData = [];

            if (goalType === 'lumpsum') {
                document.getElementById('goalResultLabel').innerText = 'Required Lumpsum Today';
                
                requiredValue = FV / Math.pow(1 + rAnnual, years);
                totalInvested = requiredValue;

                for(let y = 0; y <= years; y++) {
                    labels.push('Year ' + y);
                    investedData.push(totalInvested);
                    corpusData.push(requiredValue * Math.pow(1 + rAnnual, y));
                }
            } else {
                document.getElementById('goalResultLabel').innerText = 'Required Monthly SIP';
                
                const rMonthly = rAnnual / 12;
                const n = years * 12;

                if (rMonthly === 0) {
                    requiredValue = FV / n;
                } else {
                    requiredValue = FV * rMonthly / ( (Math.pow(1 + rMonthly, n) - 1) * (1 + rMonthly) );
                }
                
                totalInvested = requiredValue * n;

                for(let y = 0; y <= years; y++) {
                    labels.push('Year ' + y);
                    const m = y * 12;
                    investedData.push(requiredValue * m);
                    if (rMonthly === 0) {
                        corpusData.push(requiredValue * m);
                    } else {
                        corpusData.push(requiredValue * ((Math.pow(1 + rMonthly, m) - 1) / rMonthly) * (1 + rMonthly));
                    }
                }
            }

            document.getElementById('goalResultValue').innerText = formatCurrency(requiredValue);
            document.getElementById('goalInvested').innerText = formatCurrency(totalInvested);

            renderChart('goalChart', labels, [
                { label: 'Invested Amount', data: investedData, borderColor: '#9ca3af', backgroundColor: 'rgba(156, 163, 175, 0.2)', fill: true },
                { label: 'Corpus Trajectory', data: corpusData, borderColor: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.1)', fill: true }
            ], goalChartObj, (newChart) => goalChartObj = newChart);
        }

        // --- Asset Allocation Calculator ---
        function calculateAllocation() {
            const initial = Number(document.getElementById('aaInitial').value);
            const sip = Number(document.getElementById('aaSIP').value);
            const years = Number(document.getElementById('aaYears').value);

            const eqAlloc = Number(document.getElementById('aaEqAlloc').value);
            const eqRet = Number(document.getElementById('aaEqRet').value);
            
            const debtAlloc = Number(document.getElementById('aaDebtAlloc').value);
            const debtRet = Number(document.getElementById('aaDebtRet').value);
            
            const goldAlloc = Number(document.getElementById('aaGoldAlloc').value);
            const goldRet = Number(document.getElementById('aaGoldRet').value);

            const totalAlloc = eqAlloc + debtAlloc + goldAlloc;
            const warning = document.getElementById('aaAllocWarning');
            if (totalAlloc !== 100) {
                warning.classList.remove('hidden');
                warning.innerText = `Total allocation is ${totalAlloc}%. Must equal 100%.`;
            } else {
                warning.classList.add('hidden');
            }

            const weightedReturn = (eqAlloc * eqRet + debtAlloc * debtRet + goldAlloc * goldRet) / 100;
            document.getElementById('aaWeightedReturn').innerText = weightedReturn.toFixed(2) + '%';

            const totalInvested = initial + (sip * 12 * years);
            document.getElementById('aaInvested').innerText = formatCurrency(totalInvested);

            // We project individually assuming annual rebalancing
            const labels = [];
            const eqData = [];
            const debtData = [];
            const goldData = [];

            let currentEq = initial * (eqAlloc / 100);
            let currentDebt = initial * (debtAlloc / 100);
            let currentGold = initial * (goldAlloc / 100);

            for (let y = 0; y <= years; y++) {
                labels.push('Year ' + y);
                eqData.push(currentEq);
                debtData.push(currentDebt);
                goldData.push(currentGold);

                if (y < years) {
                    // Growth
                    currentEq *= (1 + eqRet / 100);
                    currentDebt *= (1 + debtRet / 100);
                    currentGold *= (1 + goldRet / 100);
                    
                    // Add SIP
                    const annualSip = sip * 12;
                    currentEq += annualSip * (eqAlloc / 100);
                    currentDebt += annualSip * (debtAlloc / 100);
                    currentGold += annualSip * (goldAlloc / 100);

                    // Rebalance (Simplified: assuming they grow and we reset back to target alloc at end of year)
                    const totalEoy = currentEq + currentDebt + currentGold;
                    currentEq = totalEoy * (eqAlloc / 100);
                    currentDebt = totalEoy * (debtAlloc / 100);
                    currentGold = totalEoy * (goldAlloc / 100);
                }
            }

            const finalValue = eqData[years] + debtData[years] + goldData[years];
            document.getElementById('aaTotal').innerText = formatCurrency(finalValue);

            renderChart('allocationChart', labels, [
                { label: 'Equity Value', data: eqData, backgroundColor: 'rgba(59, 130, 246, 0.7)', borderColor: 'rgb(59, 130, 246)', fill: true, stack: 'Stack 0' },
                { label: 'Debt Value', data: debtData, backgroundColor: 'rgba(16, 185, 129, 0.7)', borderColor: 'rgb(16, 185, 129)', fill: true, stack: 'Stack 0' },
                { label: 'Gold Value', data: goldData, backgroundColor: 'rgba(245, 158, 11, 0.7)', borderColor: 'rgb(245, 158, 11)', fill: true, stack: 'Stack 0' }
            ], allocationChartObj, (newChart) => allocationChartObj = newChart, true);
        }

        // --- Chart Renderer Helper ---
        function renderChart(canvasId, labels, datasets, chartInstance, setChartInstance, stacked = false) {
            if (chartInstance) {
                chartInstance.data.labels = labels;
                chartInstance.data.datasets = datasets;
                chartInstance.update();
            } else {
                const ctx = document.getElementById(canvasId).getContext('2d');
                const newChart = new Chart(ctx, {
                    type: 'line',
                    data: { labels, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        scales: {
                            y: {
                                stacked: stacked,
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        if (value >= 10000000) return '₹' + (value / 10000000).toFixed(1) + 'Cr';
                                        if (value >= 100000) return '₹' + (value / 100000).toFixed(1) + 'L';
                                        return '₹' + value;
                                    }
                                }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) label += ': ';
                                        if (context.parsed.y !== null) label += formatCurrency(context.parsed.y);
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
                setChartInstance(newChart);
            }
        }

        // Initialize first view
    

        // Override switchTab to include retirement
        function switchTab(tabId) {
            document.querySelectorAll('.calculator-view').forEach(el => el.classList.add('hidden'));
            const view = document.getElementById('view-' + tabId);
            if(view) view.classList.remove('hidden');

            document.querySelectorAll('nav button').forEach(el => {
                el.classList.remove('border-indigo-500', 'text-indigo-600');
                el.classList.add('border-transparent', 'text-gray-500');
            });
            const activeBtn = document.getElementById('tab-' + tabId);
            if(activeBtn) {
                activeBtn.classList.remove('border-transparent', 'text-gray-500');
                activeBtn.classList.add('border-indigo-500', 'text-indigo-600');
            }

            if(tabId === 'retirement') updateUI();
            if(tabId === 'sip') calculateSIP();
            if(tabId === 'lumpsum') calculateLumpsum();
            if(tabId === 'goal') calculateGoal();
            if(tabId === 'allocation') calculateAllocation();
        }

        // Initialize first view
        switchTab('retirement');
