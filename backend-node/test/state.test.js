import { expect } from 'chai';
import { applyRules, chooseByPriority, PRIORITIES } from '../src/server.js';

describe('state engine', () => {
  it('prioritises emergency events', () => {
    const event = { type: 'panic', source: 'mobile' };
    const current = { status: 'ON_SHIFT', source: 'TASK', ts: new Date().toISOString() };
    const result = applyRules(event, current, true);
    expect(result.status).to.equal('EMERGENCY');
    expect(result.priority).to.equal('EMERGENCY');
  });

  it('chooses by priority order', () => {
    const candidate = { status: 'EMERGENCY', priority: 'EMERGENCY', reason: 'panic' };
    const current = { status: 'BUSY', source: 'TASK', ts: new Date(Date.now() - 1000).toISOString() };
    const winner = chooseByPriority(candidate, current, new Date().toISOString());
    expect(winner.status).to.equal('EMERGENCY');
  });

  it('exports priority order', () => {
    expect(PRIORITIES).to.include('EMERGENCY');
  });
});
