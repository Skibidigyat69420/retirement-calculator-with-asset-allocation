import type { MasterPlanInputs } from '../types';
import { DEFAULT_RATES } from './constants';

/**
 * Single source of truth for a blank planning workspace: every user-entered
 * financial default is 0/empty so a zero-data state never produces invented
 * outputs. Demo data is opt-in only via demoClientInputs().
 */
export const createEmptyPlan = (): MasterPlanInputs => ({
  client: {
    name: '',
    email: '',
    advisor: '',
    reviewDate: '',
    notes: '',
    maritalStatus: '',
    familyComposition: '',
    planningPurpose: '',
    goalsSummary: '',
    insuranceSummary: '',
    investmentPhilosophy: '',
    adviceRequested: '',
    familyMembers: [],
    incomeSources: [],
    insurancePolicies: [],
  },
  currentAge: 0,
  retirementAge: 0,
  lifeExpectancy: 0,
  inflation: 0,
  annualIncome: 0,
  monthlyLivingExpenses: 0,
  monthlyExpenditure: 0,
  assets: [],
  liabilities: [],
  sip: {
    amount: 0,
    equitySplit: 0,
    debtSplit: 0,
    stepUp: 0,
    equityReturn: 0,
    debtReturn: 0,
  },
  stp: {
    active: false,
    source: 'idle-cash',
    lumpsum: 0,
    monthlyTransfer: 0,
    liquidReturn: 0,
    equitySplit: 0,
    debtSplit: 0,
    liquidCap: 0,
  },
  swp: {
    monthlyNeedToday: 0,
    postRetirementReturn: 0,
    taxRate: 0,
    startAge: 0,
    endAge: 0,
  },
  goals: [],
});

export const defaultClientInputs = createEmptyPlan;

export const demoClientInputs = (): MasterPlanInputs => ({
  client: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    advisor: 'Sound Thesis Wealth Advisory',
    reviewDate: '2026-09-12',
    notes: 'Primary focus is securing early retirement at age 50 with essential children education funded. Wants to explore aggressive equity growth.',
    maritalStatus: 'Married',
    familyComposition: 'Spouse and two children; education funding is a priority.',
    planningPurpose: 'Build retirement security while funding family milestones and leaving a legacy.',
    goalsSummary: 'Early retirement, children’s education, and buying a second home in the mountains.',
    insuranceSummary: 'Needs review of life and health cover alongside the investment plan.',
    investmentPhilosophy: 'Aggressive growth with a focus on tech equities and real estate.',
    adviceRequested: 'Confirm the allocation, sequence the next actions, and optimize tax strategy.',
    familyMembers: [
      { id: 'demo-spouse', name: 'Jane Doe', relationship: 'Spouse', dateOfBirth: '1992-05-14', status: 'Working', goal: 'Joint retirement planning' },
      { id: 'demo-son', name: 'Jimmy Doe', relationship: 'Son', dateOfBirth: '2016-08-20', status: 'Education', goal: 'Higher education and early career capital' },
      { id: 'demo-daughter', name: 'Jenny Doe', relationship: 'Daughter', dateOfBirth: '2019-11-03', status: 'Education', goal: 'Master’s education abroad' },
    ],
    incomeSources: [
      { id: 'demo-income-1', name: 'Primary Salary (Tech Exec)', amount: 4500000, amountInBaseCurrency: 4500000, currency: 'INR', frequency: 'annual', notes: 'Includes bonuses' },
      { id: 'demo-income-2', name: 'Rental Income', amount: 50000, amountInBaseCurrency: 50000, currency: 'INR', frequency: 'monthly', notes: 'From downtown apartment' },
      { id: 'demo-income-3', name: 'Dividend Yields', amount: 120000, amountInBaseCurrency: 120000, currency: 'INR', frequency: 'annual', notes: 'Stock portfolio dividends' },
    ],
    insurancePolicies: [
      { id: 'demo-life-cover', type: 'Life', provider: 'Global Life Insurance', coverage: '50000000', premium: 45000, premiumFrequency: 'annual', notes: 'Term life cover' },
      { id: 'demo-health-cover', type: 'Health', provider: 'Care Health', coverage: '10000000', premium: 35000, premiumFrequency: 'annual', notes: 'Family floater' },
    ],
  },
  currentAge: 38,
  retirementAge: 50,
  lifeExpectancy: 85,
  inflation: DEFAULT_RATES.inflation,
  annualIncome: 5220000, // 4.5M + 600k rental + 120k dividends
  monthlyLivingExpenses: 150000,
  monthlyExpenditure: 150000,
  assets: [
    {
      id: 're-primary',
      name: 'Primary Residence (Villa)',
      value: 25000000,
      returnRate: DEFAULT_RATES.realEstateReturn,
      category: 'realestate',
      currency: 'INR',
      liquidateAtRetirement: false,
    },
    {
      id: 're-rental',
      name: 'Downtown Apartment',
      value: 12000000,
      returnRate: DEFAULT_RATES.realEstateReturn,
      category: 'realestate',
      currency: 'INR',
      liquidateAtRetirement: true,
    },
    {
      id: 'mf-equity',
      name: 'Large Cap Mutual Funds',
      value: 8500000,
      returnRate: 12.5,
      category: 'equity',
      currency: 'INR',
      liquidateAtRetirement: true,
    },
    {
      id: 'direct-equity',
      name: 'Tech Stocks Portfolio',
      value: 4200000,
      returnRate: 15.0,
      category: 'equity',
      currency: 'INR',
      liquidateAtRetirement: true,
    },
    {
      id: 'pf-debt',
      name: 'Provident Fund (EPF/PPF)',
      value: 3800000,
      returnRate: 8.1,
      category: 'debt',
      currency: 'INR',
      liquidateAtRetirement: true,
    },
    {
      id: 'gold-physical',
      name: 'Physical Gold & Jewelry',
      value: 1500000,
      returnRate: DEFAULT_RATES.goldReturn,
      category: 'gold',
      currency: 'INR',
      liquidateAtRetirement: false,
    },
    {
      id: 'liquid-cash',
      name: 'Emergency Savings (Bank)',
      value: 1200000,
      returnRate: 4.5,
      category: 'liquid',
      currency: 'INR',
      liquidateAtRetirement: true,
    },
  ],
  liabilities: [
    {
      id: 'loan-home',
      name: 'Home Loan (Villa)',
      principal: 8500000,
      rate: 8.5,
      tenureYears: 15,
      monthlyPayment: 83700,
      includeInExpenses: true,
    },
    {
      id: 'loan-car',
      name: 'Auto Loan (SUV)',
      principal: 1200000,
      rate: 9.2,
      tenureYears: 4,
      monthlyPayment: 29900,
      includeInExpenses: true,
    }
  ],
  sip: {
    amount: 150000,
    equitySplit: 75,
    debtSplit: 25,
    stepUp: 10,
    equityReturn: 12,
    debtReturn: 7,
  },
  stp: {
    active: true,
    source: 'idle-cash',
    lumpsum: 1200000,
    monthlyTransfer: 100000,
    liquidReturn: 4.5,
    equitySplit: 80,
    debtSplit: 20,
    liquidCap: 300000,
  },
  swp: {
    monthlyNeedToday: 200000,
    postRetirementReturn: 8.5,
    taxRate: 10,
    startAge: 50,
    endAge: 85,
  },
  goals: [
    {
      id: 'goal-education-1',
      name: "Jimmy's Higher Education",
      targetAmount: 8000000,
      yearsToGoal: 8,
      priority: 'essential',
      inflation: 10,
      recurring: false,
    },
    {
      id: 'goal-education-2',
      name: "Jenny's Ivy League Education",
      targetAmount: 12000000,
      yearsToGoal: 11,
      priority: 'important',
      inflation: 10,
      recurring: false,
    },
    {
      id: 'goal-retirement',
      name: 'Retirement Corpus',
      targetAmount: 50000000,
      yearsToGoal: 12,
      priority: 'essential',
      inflation: 6,
      recurring: false,
    },
    {
      id: 'goal-vacation',
      name: 'Annual Luxury Vacations',
      targetAmount: 1500000,
      yearsToGoal: 1,
      priority: 'aspirational',
      inflation: 5,
      recurring: true,
    },
    {
      id: 'goal-mountain-home',
      name: 'Mountain Retreat Home',
      targetAmount: 25000000,
      yearsToGoal: 15,
      priority: 'aspirational',
      inflation: 6,
      recurring: false,
    }
  ],
});

/**
 * Fully-loaded demo household: five members, sixteen assets across every
 * category with explicit ownership on most, multiple liabilities, SIP/STP/SWP
 * and six goals. Named so the client display reads "Sample Household".
 */
export const sampleClientInputs = (): MasterPlanInputs => ({
  client: {
    name: 'Sample Household',
    email: 'sharma.family@example.com',
    advisor: 'Sound Thesis Wealth Advisory',
    reviewDate: '2026-09-14',
    notes: 'Dual-income nuclear family with two school-going children and one dependent retired parent. Focus on retirement at 60, education funding for both children, and parent healthcare provisioning. Review allocation annually and rebalance SIPs each April.',
    address: '42 Palm Grove Road, Indiranagar, Bengaluru 560038',
    phone: '+91 98450 12345',
    occupation: 'Senior Engineering Manager',
    business: 'Household IT services income; no active business interests',
    spouse: 'Priya Sharma',
    healthStatus: 'Good — no chronic conditions across the household',
    maritalStatus: 'Married',
    familyComposition: 'Self (42), spouse (40), son (14), daughter (11), dependent father (70)',
    planningPurpose: 'Fund retirement at 60 with children’s education secured, a healthcare buffer for the dependent parent, and a modest legacy for the next generation.',
    goalsSummary: 'Retirement corpus, both children’s higher education, parent healthcare buffer, recurring foreign vacations, and an estate legacy.',
    insuranceSummary: 'Term cover for both earning spouses, family floater health cover, and a senior-citizen health policy for the dependent parent. Covers verified against outstanding loans.',
    investmentPhilosophy: 'Growth-oriented with disciplined rebalancing: 70% equity during accumulation, tapering into debt as goals approach. No leverage beyond home and auto loans.',
    adviceRequested: 'Validate the retirement glide path, sequence education goal funding, and flag any insurance or estate-planning gaps.',
    familyMembers: [
      { id: 'sample-self', name: 'Arjun Sharma', relationship: 'Self', dateOfBirth: '1984-03-15', occupation: 'Senior Engineering Manager', status: 'Working', dependent: false, goal: 'Retire at 60 with a self-sustaining corpus' },
      { id: 'sample-spouse', name: 'Priya Sharma', relationship: 'Spouse', dateOfBirth: '1986-07-22', occupation: 'Architect', status: 'Working', dependent: false, goal: 'Joint retirement planning and daughter’s education abroad' },
      { id: 'sample-son', name: 'Aarav Sharma', relationship: 'Son', dateOfBirth: '2012-01-30', status: 'Education', dependent: true, goal: 'Engineering degree in 7 years' },
      { id: 'sample-daughter', name: 'Ananya Sharma', relationship: 'Daughter', dateOfBirth: '2015-09-12', status: 'Education', dependent: true, goal: 'Master’s degree abroad in 11 years' },
      { id: 'sample-parent', name: 'Ramesh Sharma', relationship: 'Father', dateOfBirth: '1955-11-05', occupation: 'Retired Government Officer', status: 'Retired', dependent: true, goal: 'Healthcare buffer and dignified support in old age' },
    ],
    incomeSources: [
      { id: 'sample-income-salary', name: 'Primary Salary (Arjun)', amount: 4800000, amountInBaseCurrency: 4800000, currency: 'INR', frequency: 'annual', notes: 'Includes annual bonus' },
      { id: 'sample-income-spouse', name: 'Salary (Priya)', amount: 1800000, amountInBaseCurrency: 1800000, currency: 'INR', frequency: 'annual', notes: 'Architecture practice income' },
      { id: 'sample-income-rental', name: 'Rental Income (Apartment)', amount: 60000, amountInBaseCurrency: 60000, currency: 'INR', frequency: 'monthly', notes: 'Downtown one-bedroom apartment' },
      { id: 'sample-income-consulting', name: 'Consulting (Arjun, part-time)', amount: 500000, amountInBaseCurrency: 500000, currency: 'INR', frequency: 'annual', notes: 'Advisory retainers' },
    ],
    insurancePolicies: [
      { id: 'sample-life-self', type: 'Life', provider: 'HDFC Life', coverage: '20000000', premium: 32000, premiumFrequency: 'annual', notes: 'Term cover for Arjun' },
      { id: 'sample-life-spouse', type: 'Life', provider: 'ICICI Prudential', coverage: '10000000', premium: 21000, premiumFrequency: 'annual', notes: 'Term cover for Priya' },
      { id: 'sample-health-floater', type: 'Health', provider: 'Star Health', coverage: '1500000', premium: 41000, premiumFrequency: 'annual', notes: 'Family floater covering all five members' },
      { id: 'sample-health-parent', type: 'Health', provider: 'Care Health', coverage: '1000000', premium: 58000, premiumFrequency: 'annual', notes: 'Senior-citizen policy for Ramesh' },
    ],
  },
  currentAge: 42,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflation: DEFAULT_RATES.inflation,
  annualIncome: 7820000, // 4.8M + 1.8M + 0.72M rental + 0.5M consulting
  monthlyLivingExpenses: 220000,
  monthlyExpenditure: 339700, // living costs + home/car/personal loan EMIs
  assets: [
    // Joint assets (no ownerMemberIds)
    { id: 'sample-re-home', name: 'Primary Residence (4BHK)', value: 32000000, returnRate: DEFAULT_RATES.realEstateReturn, category: 'realestate', currency: 'INR', liquidateAtRetirement: false },
    { id: 'sample-eq-flexicap', name: 'Flexicap Mutual Funds', value: 8500000, returnRate: 12, category: 'equity', currency: 'INR', liquidateAtRetirement: true },
    { id: 'sample-debt-ppf', name: 'Family PPF Accounts', value: 2200000, returnRate: 7.1, category: 'debt', currency: 'INR', liquidateAtRetirement: true },
    { id: 'sample-gold-jewellery', name: 'Gold Jewellery & Coins', value: 900000, returnRate: DEFAULT_RATES.goldReturn, category: 'gold', currency: 'INR', liquidateAtRetirement: false },
    { id: 'sample-liq-emergency', name: 'Emergency Fund (Sweep FD)', value: 1500000, returnRate: 6, category: 'liquid', currency: 'INR', liquidateAtRetirement: true },
    // Arjun (self)
    { id: 'sample-eq-esops', name: 'ESOP Units (Employer)', value: 6500000, returnRate: 14, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-self'] },
    { id: 'sample-eq-direct', name: 'Direct Equity Portfolio', value: 2800000, returnRate: 13, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-self'] },
    { id: 'sample-debt-epf', name: 'EPF (Arjun)', value: 3000000, returnRate: 8.1, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-self'] },
    { id: 'sample-other-crypto', name: 'Digital Assets (BTC/ETH)', value: 400000, returnRate: 0, category: 'other', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-self'] },
    // Priya (spouse)
    { id: 'sample-eq-spouse-mf', name: 'Equity Mutual Funds (Priya)', value: 4000000, returnRate: 12, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-spouse'] },
    { id: 'sample-debt-nps', name: 'NPS Tier-1 (Priya)', value: 1200000, returnRate: 9, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-spouse'] },
    { id: 'sample-gold-sgb', name: 'Sovereign Gold Bonds (Priya)', value: 600000, returnRate: 8, category: 'gold', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-spouse'] },
    // Children
    { id: 'sample-debt-son-corpus', name: 'Children Education Corpus (Debt)', value: 800000, returnRate: 7.5, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-son'] },
    { id: 'sample-debt-sukanya', name: 'Sukanya Samriddhi (Ananya)', value: 700000, returnRate: 8.2, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-daughter'] },
    // Ramesh (parent)
    { id: 'sample-debt-scss', name: 'Senior Citizens Savings Scheme', value: 1500000, returnRate: 8.2, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-parent'] },
    { id: 'sample-liq-parent-fd', name: 'Fixed Deposits (Ramesh)', value: 1000000, returnRate: 7.5, category: 'liquid', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-parent'] },
    { id: 'sample-re-ancestral', name: 'Ancestral Plot (Tier-2 Town)', value: 4500000, returnRate: 4, category: 'realestate', currency: 'INR', liquidateAtRetirement: false, ownerMemberIds: ['sample-parent'] },
    { id: 'sample-re-rental', name: 'Joint Rental Apartment', value: 9500000, returnRate: DEFAULT_RATES.realEstateReturn, category: 'realestate', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['sample-self', 'sample-spouse'] },
  ],
  liabilities: [
    { id: 'sample-loan-home', name: 'Home Loan (Primary Residence)', principal: 6200000, rate: 8.4, tenureYears: 12, monthlyPayment: 68500, includeInExpenses: true, currency: 'INR', lender: 'SBI Home Finance' },
    { id: 'sample-loan-car', name: 'Auto Loan (SUV)', principal: 1400000, rate: 9, tenureYears: 4, monthlyPayment: 34900, includeInExpenses: true, currency: 'INR', lender: 'HDFC Bank' },
    { id: 'sample-loan-personal', name: 'Personal Loan (Renovation)', principal: 500000, rate: 11, tenureYears: 3, monthlyPayment: 16400, includeInExpenses: true, currency: 'INR', lender: 'Axis Bank' },
  ],
  sip: {
    amount: 150000,
    equitySplit: 70,
    debtSplit: 30,
    stepUp: 8,
    equityReturn: 12,
    debtReturn: 7.5,
  },
  stp: {
    active: true,
    source: 'idle-cash',
    lumpsum: 1500000,
    monthlyTransfer: 125000,
    liquidReturn: 6.5,
    equitySplit: 70,
    debtSplit: 30,
    liquidCap: 400000,
  },
  swp: {
    monthlyNeedToday: 250000,
    postRetirementReturn: 8.5,
    taxRate: 10,
    startAge: 60,
    endAge: 85,
  },
  goals: [
    { id: 'sample-goal-retirement', name: 'Retirement Corpus (Age 60)', targetAmount: 80000000, yearsToGoal: 18, priority: 'essential', inflation: 6, recurring: false, currency: 'INR' },
    { id: 'sample-goal-son-edu', name: "Aarav's Engineering Education", targetAmount: 6000000, yearsToGoal: 7, priority: 'essential', inflation: 10, recurring: false, currency: 'INR' },
    { id: 'sample-goal-daughter-edu', name: "Ananya's Master's Abroad", targetAmount: 12000000, yearsToGoal: 11, priority: 'important', inflation: 10, recurring: false, currency: 'INR' },
    { id: 'sample-goal-parent-care', name: 'Parent Healthcare Buffer', targetAmount: 3000000, yearsToGoal: 5, priority: 'important', inflation: 8, recurring: false, currency: 'INR' },
    { id: 'sample-goal-vacation', name: 'Foreign Family Vacation', targetAmount: 800000, yearsToGoal: 3, priority: 'aspirational', inflation: 5, recurring: true, currency: 'INR' },
    { id: 'sample-goal-legacy', name: 'Legacy & Estate Transfer', targetAmount: 20000000, yearsToGoal: 25, priority: 'aspirational', inflation: 6, recurring: false, currency: 'INR' },
  ],
});

/**
 * Early-career FIRE aspirant: single Bengaluru software engineer, 28, no
 * dependents, aggressive 80/20 SIP with a 10% annual step-up, a fully-funded
 * emergency buffer and four goals anchored by a retire-at-45 corpus.
 */
export const aaravClientInputs = (): MasterPlanInputs => ({
  client: {
    name: 'Aarav Mehta',
    email: 'aarav.mehta@example.com',
    advisor: 'Sound Thesis Wealth Advisory',
    reviewDate: '2026-09-15',
    notes: 'Single, no dependents, aggressive FIRE aspirant. Wants the FIRE timeline stress-tested and the MBA / sabbatical trip sequenced without denting the corpus.',
    address: 'B-1204, Prestige Towers, Koramangala, Bengaluru 560034',
    phone: '+91 98861 40217',
    occupation: 'Software Engineer (Senior SDE)',
    maritalStatus: 'Single',
    planningPurpose: 'Achieve financial independence by 45 and fund near-term growth goals without compromising the FIRE corpus.',
    goalsSummary: 'One-year emergency buffer, FIRE corpus by 45, a sabbatical world trip, and an executive MBA.',
    insuranceSummary: 'Individual health cover of ₹10L; no life cover yet (no dependents).',
    investmentPhilosophy: 'Aggressive equity compounding with a 10% annual SIP step-up; 80/20 equity-debt split with a dedicated liquid buffer.',
    adviceRequested: 'Stress-test the FIRE timeline, sequence the MBA and trip against the corpus, and flag insurance gaps.',
    familyMembers: [
      { id: 'aarav-self', name: 'Aarav Mehta', relationship: 'Self', dateOfBirth: '1998-04-10', occupation: 'Software Engineer (Senior SDE)', status: 'Working', dependent: false, goal: 'Financial independence by 45' },
    ],
    incomeSources: [
      { id: 'aarav-income-salary', name: 'Salary (Senior SDE)', amount: 3200000, amountInBaseCurrency: 3200000, currency: 'INR', frequency: 'annual', notes: 'Includes annual bonus and ESOP vesting' },
    ],
    insurancePolicies: [
      { id: 'aarav-health', type: 'Health', provider: 'Niva Bupa', coverage: '1000000', premium: 11800, premiumFrequency: 'annual', notes: 'Individual health cover' },
    ],
  },
  currentAge: 28,
  retirementAge: 45,
  lifeExpectancy: 85,
  inflation: DEFAULT_RATES.inflation,
  annualIncome: 3200000,
  monthlyLivingExpenses: 90000,
  monthlyExpenditure: 90000,
  assets: [
    { id: 'aarav-eq-index', name: 'Nifty Index Funds', value: 900000, returnRate: 12, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['aarav-self'] },
    { id: 'aarav-eq-direct', name: 'Direct Equity & ESPP', value: 450000, returnRate: 14, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['aarav-self'] },
    { id: 'aarav-liq-emergency', name: 'Emergency Fund (Liquid MF)', value: 800000, returnRate: 6.5, category: 'liquid', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['aarav-self'] },
    { id: 'aarav-liq-fd', name: 'Sweep-in Fixed Deposit', value: 250000, returnRate: 6, category: 'liquid', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['aarav-self'] },
  ],
  liabilities: [],
  sip: {
    amount: 60000,
    equitySplit: 80,
    debtSplit: 20,
    stepUp: 10,
    equityReturn: 12,
    debtReturn: 7,
  },
  stp: {
    active: false,
    source: 'idle-cash',
    lumpsum: 0,
    monthlyTransfer: 0,
    liquidReturn: 6.5,
    equitySplit: 80,
    debtSplit: 20,
    liquidCap: 0,
  },
  swp: {
    monthlyNeedToday: 0,
    postRetirementReturn: 8.5,
    taxRate: 10,
    startAge: 45,
    endAge: 85,
  },
  goals: [
    { id: 'aarav-goal-emergency', name: 'Emergency Buffer (1 Year)', targetAmount: 900000, yearsToGoal: 1, priority: 'essential', inflation: 5, recurring: false, currency: 'INR' },
    { id: 'aarav-goal-fire', name: 'FIRE Corpus (Retire at 45)', targetAmount: 60000000, yearsToGoal: 17, priority: 'essential', inflation: 6, recurring: false, currency: 'INR' },
    { id: 'aarav-goal-trip', name: 'Sabbatical World Trip', targetAmount: 1500000, yearsToGoal: 3, priority: 'aspirational', inflation: 5, recurring: false, currency: 'INR' },
    { id: 'aarav-goal-mba', name: 'Executive MBA / Self-upskilling', targetAmount: 800000, yearsToGoal: 2, priority: 'important', inflation: 8, recurring: false, currency: 'INR' },
  ],
});

/**
 * Late-starter catch-up household: Mumbai marketing director, 48, married
 * with two school-going children and a dependent mother. Big 70/30 SIP with
 * an 8% step-up, two loans, and ownership-tagged assets across all six
 * categories.
 */
export const vikramClientInputs = (): MasterPlanInputs => ({
  client: {
    name: 'Vikram Rao',
    email: 'vikram.rao@example.com',
    advisor: 'Sound Thesis Wealth Advisory',
    reviewDate: '2026-09-15',
    notes: 'Started serious saving only at 42; now playing catch-up for retirement at 60 while funding two educations and elder care. Review the legacy ULIP and term cover sizing.',
    address: '14 Marine Crest, Bandra West, Mumbai 400050',
    phone: '+91 98200 71465',
    occupation: 'Marketing Director (Consumer FMCG)',
    business: 'None for Vikram; spouse runs a small interior-design practice',
    spouse: 'Meera Rao',
    healthStatus: 'Good across the household; mother manages mild hypertension',
    maritalStatus: 'Married',
    familyComposition: 'Self (48), spouse (45), son (12), daughter (9), dependent mother (77)',
    planningPurpose: 'Close the retirement gap over the next 12 years while fully funding both children’s education and provisioning for mother’s care.',
    goalsSummary: 'Two education goals, a retirement corpus at 60, a home upgrade, and a dedicated mother-care corpus.',
    insuranceSummary: 'Term cover for Vikram, family floater health, car insurance, and an older ULIP under review. Cover verified against the outstanding home loan.',
    investmentPhilosophy: 'Moderate-aggressive catch-up: 70/30 equity-debt SIP with an 8% annual step-up; education corpuses parked in debt, equity reserved for retirement.',
    adviceRequested: 'Close the retirement gap, sequence education versus the home upgrade, review the legacy ULIP, and size term cover against the home loan.',
    familyMembers: [
      { id: 'vikram-self', name: 'Vikram Rao', relationship: 'Self', dateOfBirth: '1978-06-18', occupation: 'Marketing Director', status: 'Working', dependent: false, goal: 'Retire at 60 with education fully funded' },
      { id: 'vikram-spouse', name: 'Meera Rao', relationship: 'Spouse', dateOfBirth: '1981-02-09', occupation: 'Interior Designer', status: 'Working', dependent: false, goal: 'Joint retirement planning' },
      { id: 'vikram-son', name: 'Aryan Rao', relationship: 'Son', dateOfBirth: '2014-03-25', status: 'Education', dependent: true, goal: 'Engineering degree abroad in 6 years' },
      { id: 'vikram-daughter', name: 'Diya Rao', relationship: 'Daughter', dateOfBirth: '2017-08-14', status: 'Education', dependent: true, goal: 'Undergraduate degree abroad in 9 years' },
      { id: 'vikram-mother', name: 'Kamala Rao', relationship: 'Mother', dateOfBirth: '1948-12-02', occupation: 'Homemaker (retired)', status: 'Retired', dependent: true, goal: 'Healthcare and dignified elder care' },
    ],
    incomeSources: [
      { id: 'vikram-income-salary', name: 'Salary (Marketing Director)', amount: 7000000, amountInBaseCurrency: 7000000, currency: 'INR', frequency: 'annual', notes: 'Includes performance bonus' },
      { id: 'vikram-income-spouse', name: 'Income (Meera, Design Practice)', amount: 900000, amountInBaseCurrency: 900000, currency: 'INR', frequency: 'annual', notes: 'Project-based earnings' },
      { id: 'vikram-income-rental', name: 'Rental Income (Andheri Flat)', amount: 50000, amountInBaseCurrency: 50000, currency: 'INR', frequency: 'monthly', notes: 'Two-bedroom investment flat' },
    ],
    insurancePolicies: [
      { id: 'vikram-life-term', type: 'Life', provider: 'ICICI Prudential', coverage: '50000000', premium: 68000, premiumFrequency: 'annual', notes: 'Term cover for Vikram' },
      { id: 'vikram-health-floater', type: 'Health', provider: 'HDFC Ergo', coverage: '1500000', premium: 52000, premiumFrequency: 'annual', notes: 'Family floater covering all five members' },
      { id: 'vikram-car', type: 'Motor', provider: 'Bajaj Allianz', coverage: '800000', premium: 14000, premiumFrequency: 'annual', notes: 'Comprehensive car cover' },
      { id: 'vikram-ulip', type: 'ULIP', provider: 'LIC', coverage: '5000000', premium: 150000, premiumFrequency: 'annual', notes: 'Legacy ULIP from 2012 — surrender under review' },
    ],
  },
  currentAge: 48,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflation: DEFAULT_RATES.inflation,
  annualIncome: 8500000, // 7.0M salary + 0.9M spouse + 0.6M rental
  monthlyLivingExpenses: 180000,
  monthlyExpenditure: 279300, // living costs + home and auto loan EMIs
  assets: [
    // Joint assets (no ownerMemberIds)
    { id: 'vik-re-home', name: 'Primary Residence (Sea-facing 3BHK)', value: 26000000, returnRate: DEFAULT_RATES.realEstateReturn, category: 'realestate', currency: 'INR', liquidateAtRetirement: false },
    { id: 'vik-gold-jewellery', name: 'Gold Jewellery & Coins', value: 1800000, returnRate: DEFAULT_RATES.goldReturn, category: 'gold', currency: 'INR', liquidateAtRetirement: false },
    { id: 'vik-liq-emergency', name: 'Emergency Fund (Sweep FD)', value: 2000000, returnRate: 6.5, category: 'liquid', currency: 'INR', liquidateAtRetirement: true },
    // Vikram (self)
    { id: 'vik-eq-mf', name: 'Flexicap & Midcap Funds', value: 9500000, returnRate: 12.5, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-self'] },
    { id: 'vik-eq-direct', name: 'Direct Equity Portfolio', value: 4000000, returnRate: 13, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-self'] },
    { id: 'vik-debt-epf', name: 'EPF (Vikram)', value: 5500000, returnRate: 8.1, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-self'] },
    { id: 'vik-other-esop', name: 'Unlisted ESOPs (Employer)', value: 1200000, returnRate: 10, category: 'other', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-self'] },
    { id: 'vik-re-rental', name: 'Rental Apartment (Andheri)', value: 11000000, returnRate: DEFAULT_RATES.realEstateReturn, category: 'realestate', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-self'] },
    // Meera (spouse)
    { id: 'vik-eq-spouse', name: 'Equity Mutual Funds (Meera)', value: 3000000, returnRate: 12, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-spouse'] },
    { id: 'vik-debt-ppf', name: 'PPF (Meera)', value: 1800000, returnRate: 7.1, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-spouse'] },
    // Children
    { id: 'vik-debt-son', name: "Aryan's Education Corpus (Debt RD)", value: 800000, returnRate: 7.5, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-son'] },
    { id: 'vik-debt-sukanya', name: 'Sukanya Samriddhi (Diya)', value: 1200000, returnRate: 8.2, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-daughter'] },
    // Kamala (mother)
    { id: 'vik-debt-scss', name: 'Senior Citizens Savings Scheme (Kamala)', value: 2000000, returnRate: 8.2, category: 'debt', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['vikram-mother'] },
  ],
  liabilities: [
    { id: 'vik-loan-home', name: 'Home Loan (Primary Residence)', principal: 6500000, rate: 8.5, tenureYears: 10, monthlyPayment: 80600, includeInExpenses: true, currency: 'INR', lender: 'HDFC Bank' },
    { id: 'vik-loan-car', name: 'Auto Loan (Sedan)', principal: 900000, rate: 9, tenureYears: 5, monthlyPayment: 18700, includeInExpenses: true, currency: 'INR', lender: 'Axis Bank' },
  ],
  sip: {
    amount: 150000,
    equitySplit: 70,
    debtSplit: 30,
    stepUp: 8,
    equityReturn: 12,
    debtReturn: 7.5,
  },
  stp: {
    active: true,
    source: 'idle-cash',
    lumpsum: 2000000,
    monthlyTransfer: 100000,
    liquidReturn: 6.5,
    equitySplit: 70,
    debtSplit: 30,
    liquidCap: 500000,
  },
  swp: {
    monthlyNeedToday: 250000,
    postRetirementReturn: 8.5,
    taxRate: 10,
    startAge: 60,
    endAge: 85,
  },
  goals: [
    { id: 'vik-goal-son-edu', name: "Aryan's Engineering Abroad", targetAmount: 10000000, yearsToGoal: 6, priority: 'essential', inflation: 10, recurring: false, currency: 'INR' },
    { id: 'vik-goal-daughter-edu', name: "Diya's Undergraduate Abroad", targetAmount: 14000000, yearsToGoal: 9, priority: 'essential', inflation: 10, recurring: false, currency: 'INR' },
    { id: 'vik-goal-home', name: 'Home Upgrade (4BHK)', targetAmount: 35000000, yearsToGoal: 7, priority: 'important', inflation: 6, recurring: false, currency: 'INR' },
    { id: 'vik-goal-retirement', name: 'Retirement Corpus (Age 60)', targetAmount: 90000000, yearsToGoal: 12, priority: 'essential', inflation: 6, recurring: false, currency: 'INR' },
    { id: 'vik-goal-mother', name: "Mother's Care Corpus", targetAmount: 5000000, yearsToGoal: 10, priority: 'important', inflation: 8, recurring: false, currency: 'INR' },
  ],
});

/**
 * Pre-retirement conservative household: Hyderabad couple, 57 and 58,
 * retiring at 60 with a ₹4.2Cr debt-heavy corpus. SWP income plan, an
 * equity-light STP from idle cash, five insurance policies and a withdrawal
 * strategy plus estate basics on the advice agenda.
 */
export const khannaClientInputs = (): MasterPlanInputs => ({
  client: {
    name: 'Sunita & Ashok Khanna',
    email: 'khanna.household@example.com',
    advisor: 'Sound Thesis Wealth Advisory',
    reviewDate: '2026-09-15',
    notes: 'Three years from retirement. Core question is how to turn the corpus into a reliable monthly income without taking sequence-of-returns risk. Estate basics (nominations, will) not yet done.',
    address: '8-2-293, Road No. 12, Banjara Hills, Hyderabad 500034',
    phone: '+91 99481 26670',
    occupation: 'Banking Executive (retiring 2029)',
    business: 'None — pension and rental household',
    spouse: 'Ashok Khanna',
    healthStatus: 'Both managing blood pressure; Ashok has a planned joint replacement in 2027',
    maritalStatus: 'Married',
    familyComposition: 'Self (57), spouse (58), dependent brother (64)',
    planningPurpose: 'Convert a lifetime of savings into a reliable, inflation-aware income stream from age 60 while preserving capital for medical contingencies and heirs.',
    goalsSummary: 'Retirement income from 60, a medical reserve, golden-years travel, and an education gift for the first grandchild.',
    insuranceSummary: 'Senior-citizen health covers for both spouses, a deferred annuity starting at 60, residual term cover, and motor insurance. Health covers under review given pre-existing conditions.',
    investmentPhilosophy: 'Capital preservation with inflation-beating income: debt-heavy corpus, modest equity for growth, and systematic STP deployment of idle cash.',
    adviceRequested: 'Design the withdrawal strategy (SWP buckets, annuity coordination, FD ladders), right-size the medical reserve, and cover estate basics — nominations and a simple will.',
    familyMembers: [
      { id: 'kh-self', name: 'Sunita Khanna', relationship: 'Self', dateOfBirth: '1969-01-22', occupation: 'General Manager, Public Sector Bank', status: 'Working', dependent: false, goal: 'Smooth transition from salary to SWP income at 60' },
      { id: 'kh-spouse', name: 'Ashok Khanna', relationship: 'Spouse', dateOfBirth: '1967-10-05', occupation: 'Retired Government Engineer', status: 'Retired', dependent: false, goal: 'Stable pension-plus-SWP income and estate clarity' },
      { id: 'kh-sibling', name: 'Rajesh Khanna', relationship: 'Brother', dateOfBirth: '1962-05-30', status: 'Dependent', dependent: true, goal: 'Long-term care support' },
    ],
    incomeSources: [
      { id: 'kh-income-salary', name: 'Salary (Sunita, final service years)', amount: 4800000, amountInBaseCurrency: 4800000, currency: 'INR', frequency: 'annual', notes: 'Retires March 2029' },
      { id: 'kh-income-rent', name: 'Rent (Old Family Home, Secunderabad)', amount: 30000, amountInBaseCurrency: 30000, currency: 'INR', frequency: 'monthly', notes: 'Long-standing tenant' },
      { id: 'kh-income-fd', name: 'FD & Bond Interest', amount: 1200000, amountInBaseCurrency: 1200000, currency: 'INR', frequency: 'annual', notes: 'Laddered deposits' },
    ],
    insurancePolicies: [
      { id: 'kh-annuity', type: 'Annuity', provider: 'LIC', coverage: '20000000', premium: 2500000, premiumFrequency: 'annual', notes: 'Jeevan Akshay — one-time purchase at 55, payouts start at 60' },
      { id: 'kh-health-self', type: 'Health', provider: 'Star Health', coverage: '1000000', premium: 64000, premiumFrequency: 'annual', notes: 'Senior-citizen policy (Sunita)' },
      { id: 'kh-health-spouse', type: 'Health', provider: 'Care Health', coverage: '1000000', premium: 68000, premiumFrequency: 'annual', notes: 'Senior-citizen policy (Ashok)' },
      { id: 'kh-term', type: 'Life', provider: 'HDFC Life', coverage: '20000000', premium: 27000, premiumFrequency: 'annual', notes: 'Term cover running to age 65' },
      { id: 'kh-motor', type: 'Motor', provider: 'Bajaj Allianz', coverage: '600000', premium: 9500, premiumFrequency: 'annual', notes: 'Comprehensive car cover' },
    ],
  },
  currentAge: 57,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflation: DEFAULT_RATES.inflation,
  annualIncome: 6360000, // 4.8M salary + 0.36M rent + 1.2M FD interest
  monthlyLivingExpenses: 120000,
  monthlyExpenditure: 120000,
  assets: [
    // Joint assets (no ownerMemberIds)
    { id: 'kh-re-home', name: 'Self-occupied Apartment (Banjara Hills)', value: 13500000, returnRate: DEFAULT_RATES.realEstateReturn, category: 'realestate', currency: 'INR', liquidateAtRetirement: false },
    { id: 'kh-debt-funds', name: 'Debt Mutual Funds', value: 7500000, returnRate: 7, category: 'debt', currency: 'INR', liquidateAtRetirement: true },
    { id: 'kh-liq-fd', name: 'Bank FDs & Bonds', value: 5500000, returnRate: 7, category: 'liquid', currency: 'INR', liquidateAtRetirement: true },
    { id: 'kh-debt-epf', name: 'EPF + PPF (Combined)', value: 7000000, returnRate: 8.1, category: 'debt', currency: 'INR', liquidateAtRetirement: true },
    { id: 'kh-liq-sweep', name: 'Sweep-in Savings', value: 2000000, returnRate: 6, category: 'liquid', currency: 'INR', liquidateAtRetirement: true },
    { id: 'kh-gold', name: 'Gold & Sovereign Gold Bonds', value: 2000000, returnRate: 8, category: 'gold', currency: 'INR', liquidateAtRetirement: true },
    // Sunita (self)
    { id: 'kh-eq-bluechip', name: 'Blue-chip Equity Funds (Sunita)', value: 3500000, returnRate: 11, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['kh-self'] },
    // Ashok (spouse)
    { id: 'kh-eq-spouse', name: 'Dividend & Balanced Funds (Ashok)', value: 1000000, returnRate: 10, category: 'equity', currency: 'INR', liquidateAtRetirement: true, ownerMemberIds: ['kh-spouse'] },
  ],
  liabilities: [],
  sip: {
    amount: 50000,
    equitySplit: 30,
    debtSplit: 70,
    stepUp: 0,
    equityReturn: 11,
    debtReturn: 7,
  },
  stp: {
    active: true,
    source: 'idle-cash',
    lumpsum: 2000000,
    monthlyTransfer: 50000,
    liquidReturn: 6.5,
    equitySplit: 30,
    debtSplit: 70,
    liquidCap: 1000000,
  },
  swp: {
    monthlyNeedToday: 120000,
    postRetirementReturn: 8,
    taxRate: 10,
    startAge: 60,
    endAge: 85,
  },
  goals: [
    { id: 'kh-goal-income', name: 'Retirement Income Continuity (Age 60)', targetAmount: 30000000, yearsToGoal: 3, priority: 'essential', inflation: 6, recurring: false, currency: 'INR' },
    { id: 'kh-goal-grandchild', name: "Grandchild's Education Gift", targetAmount: 2500000, yearsToGoal: 6, priority: 'aspirational', inflation: 8, recurring: false, currency: 'INR' },
    { id: 'kh-goal-travel', name: 'Travel Corpus (Golden Years)', targetAmount: 4000000, yearsToGoal: 2, priority: 'important', inflation: 6, recurring: true, currency: 'INR' },
    { id: 'kh-goal-medical', name: 'Medical Reserve (Critical Care)', targetAmount: 6000000, yearsToGoal: 1, priority: 'essential', inflation: 9, recurring: false, currency: 'INR' },
  ],
});
