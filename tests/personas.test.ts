import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { MasterPlanInputs } from '../src/types';
import { PERSONAS, getPersona } from '../src/lib/personas';
import { demoClientInputs, sampleClientInputs } from '../src/lib/scenarios';
import { RISK_QUESTIONS } from '../src/lib/riskQuestionnaire';
import { MAX_HOUSEHOLD_MEMBERS } from '../src/lib/householdEngine';

const PRIORITIES = ['essential', 'important', 'aspirational'];

function assertValidPlan(inputs: MasterPlanInputs, context: string) {
  assert.ok(inputs.client.name, `${context}: client.name`);
  assert.ok(inputs.client.advisor, `${context}: client.advisor`);
  assert.ok(inputs.client.reviewDate, `${context}: client.reviewDate`);
  assert.ok(inputs.currentAge > 0, `${context}: currentAge`);
  assert.ok(inputs.currentAge < inputs.retirementAge, `${context}: currentAge < retirementAge`);
  assert.ok(inputs.retirementAge < inputs.lifeExpectancy, `${context}: retirementAge < lifeExpectancy`);
  assert.ok(inputs.inflation > 0, `${context}: inflation`);
  assert.ok(inputs.annualIncome > 0, `${context}: annualIncome`);
  assert.ok(inputs.monthlyLivingExpenses > 0, `${context}: monthlyLivingExpenses`);
  assert.ok(inputs.assets.length > 0, `${context}: assets non-empty`);
  assert.ok(inputs.goals.length > 0, `${context}: goals non-empty`);

  const familyIds = new Set((inputs.client.familyMembers ?? []).map((m) => m.id));
  const seenAssetIds = new Set<string>();
  for (const asset of inputs.assets) {
    assert.ok(asset.id && !seenAssetIds.has(asset.id), `${context}: duplicate asset id ${asset.id}`);
    seenAssetIds.add(asset.id);
    assert.ok(asset.value > 0, `${context}: asset ${asset.id} value`);
    assert.equal(asset.currency, 'INR', `${context}: asset ${asset.id} currency`);
    for (const ownerId of asset.ownerMemberIds ?? []) {
      assert.ok(familyIds.has(ownerId), `${context}: asset ${asset.id} references unknown member ${ownerId}`);
    }
  }

  const seenLiabilityIds = new Set<string>();
  for (const liability of inputs.liabilities) {
    assert.ok(liability.id && !seenLiabilityIds.has(liability.id), `${context}: duplicate liability id ${liability.id}`);
    seenLiabilityIds.add(liability.id);
  }

  const seenGoalIds = new Set<string>();
  for (const goal of inputs.goals) {
    assert.ok(goal.id && !seenGoalIds.has(goal.id), `${context}: duplicate goal id ${goal.id}`);
    seenGoalIds.add(goal.id);
    assert.ok(PRIORITIES.includes(goal.priority), `${context}: goal ${goal.id} priority ${goal.priority}`);
    assert.ok(goal.targetAmount > 0, `${context}: goal ${goal.id} targetAmount`);
    assert.ok(goal.yearsToGoal > 0, `${context}: goal ${goal.id} yearsToGoal`);
  }

  const seenMemberIds = new Set<string>();
  for (const member of inputs.client.familyMembers ?? []) {
    assert.ok(member.id && !seenMemberIds.has(member.id), `${context}: duplicate member id ${member.id}`);
    seenMemberIds.add(member.id);
  }
  const seenIncomeIds = new Set<string>();
  for (const source of inputs.client.incomeSources ?? []) {
    assert.ok(source.id && !seenIncomeIds.has(source.id), `${context}: duplicate income id ${source.id}`);
    seenIncomeIds.add(source.id);
  }
  const seenPolicyIds = new Set<string>();
  for (const policy of inputs.client.insurancePolicies ?? []) {
    assert.ok(policy.id && !seenPolicyIds.has(policy.id), `${context}: duplicate policy id ${policy.id}`);
    seenPolicyIds.add(policy.id);
  }

  assert.ok(inputs.swp.startAge >= inputs.retirementAge, `${context}: swp.startAge >= retirementAge`);
  assert.ok(inputs.swp.endAge <= inputs.lifeExpectancy, `${context}: swp.endAge <= lifeExpectancy`);
}

describe('personas', () => {
  it('has unique ids and complete display metadata for every persona', () => {
    const ids = PERSONAS.map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, 'persona ids must be unique');
    for (const persona of PERSONAS) {
      for (const field of ['label', 'tagline', 'lifeStage', 'riskStyle', 'initials', 'accent', 'description'] as const) {
        assert.ok(persona[field], `persona ${persona.id}: expected ${field} to be filled`);
      }
    }
  });

  it('build() returns a valid MasterPlanInputs for every persona', () => {
    for (const persona of PERSONAS) {
      assertValidPlan(persona.build(), persona.id);
    }
  });

  it('keeps households within the member limit', () => {
    for (const persona of PERSONAS) {
      const members = persona.build().client.familyMembers ?? [];
      assert.ok(members.length <= MAX_HOUSEHOLD_MEMBERS, `persona ${persona.id}: ${members.length} members exceeds limit`);
    }
  });

  it('risk answers reference real questions and valid option scores', () => {
    const questions = new Map(RISK_QUESTIONS.map((q) => [q.id, q]));
    const withAnswers = PERSONAS.filter((p) => p.riskAnswers);
    assert.ok(withAnswers.length >= 3, 'expected at least three personas with risk answers');
    for (const persona of withAnswers) {
      for (const [questionId, score] of Object.entries(persona.riskAnswers!)) {
        const question = questions.get(questionId);
        assert.ok(question, `persona ${persona.id}: unknown question ${questionId}`);
        const scores = question.options.map((o) => o.score);
        assert.ok(scores.includes(score), `persona ${persona.id}: score ${score} not an option for ${questionId}`);
      }
    }
  });

  it('getPersona resolves known ids, returns undefined for unknown ids, and covers the legacy factories', () => {
    for (const persona of PERSONAS) {
      assert.equal(getPersona(persona.id)?.id, persona.id);
    }
    assert.equal(getPersona('no-such-persona'), undefined);
    assert.deepEqual(getPersona('john-doe')?.build(), demoClientInputs());
    assert.deepEqual(getPersona('sharma-household')?.build(), sampleClientInputs());
  });

  it('builds are deterministic', () => {
    for (const persona of PERSONAS) {
      assert.deepEqual(persona.build(), persona.build(), `persona ${persona.id} build is not deterministic`);
    }
  });

  it('persona-specific promises hold: assets, liabilities, goals, income, insurance', () => {
    const byId = new Map(PERSONAS.map((p) => [p.id, p.build()]));

    const aarav = byId.get('aarav-mehta')!;
    assert.equal(aarav.assets.length, 4);
    assert.ok(aarav.liabilities.length === 0);
    assert.equal((aarav.client.incomeSources ?? []).length, 1);
    assert.equal((aarav.client.insurancePolicies ?? []).length, 1);
    assert.equal(aarav.goals.length, 4);

    const vikram = byId.get('vikram-rao')!;
    assert.ok(vikram.assets.length >= 8, `expected 8+ assets, got ${vikram.assets.length}`);
    assert.equal(vikram.liabilities.length, 2);
    assert.equal((vikram.client.incomeSources ?? []).length, 3);
    assert.equal((vikram.client.insurancePolicies ?? []).length, 4);
    assert.equal(vikram.goals.length, 5);
    assert.ok(vikram.sip.amount >= 150000);
    const tagged = vikram.assets.filter((a) => (a.ownerMemberIds?.length ?? 0) > 0).length;
    assert.ok(tagged >= 5, `expected 5+ ownership-tagged assets, got ${tagged}`);

    const khanna = byId.get('khanna-couple')!;
    assert.equal(khanna.client.familyMembers?.length, 3);
    assert.equal((khanna.client.incomeSources ?? []).length, 3);
    assert.equal((khanna.client.insurancePolicies ?? []).length, 5);
    assert.equal(khanna.goals.length, 4);
    assert.equal(khanna.swp.monthlyNeedToday, 120000);
    assert.equal(khanna.swp.startAge, 60);
    assert.equal(khanna.stp.active, true);
    const corpus = khanna.assets.reduce((sum, a) => sum + a.value, 0);
    assert.ok(corpus >= 40000000 && corpus <= 45000000, `expected ~₹4.2Cr corpus, got ${corpus}`);
  });
});
