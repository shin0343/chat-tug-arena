import type { SimulationProgress, TeamKeywords } from '@chat-tug/contracts';
export type SimulationAction = { at: number; kind: 'step'; step: SimulationProgress['step'] } | { at: number; kind: 'message'; id: string; user: number; text: string } | { at: number; kind: 'invalid' };
export function simulationPlan(commands: TeamKeywords): SimulationAction[] {
  return [
    { at: 0, kind: 'step', step: 'starting' },
    { at: 100, kind: 'message', id: 'one', user: 1, text: commands.coral },
    { at: 250, kind: 'message', id: 'two', user: 2, text: commands.mint.toUpperCase() },
    { at: 350, kind: 'message', id: 'ordinary', user: 3, text: `hello ${commands.coral}` },
    { at: 400, kind: 'step', step: 'burst' },
    ...Array.from({ length: 6 }, (_, i) => ({ at: 450 + i * 60, kind: 'message' as const, id: `burst-${i}`, user: i % 4 + 1, text: i % 2 ? commands.mint : commands.coral })),
    { at: 850, kind: 'invalid' },
    { at: 1000, kind: 'message', id: 'two', user: 2, text: commands.mint },
    { at: 1150, kind: 'message', id: 'substring', user: 4, text: `${commands.coral}ish` },
    { at: 1300, kind: 'step', step: 'quiet' },
    { at: 2500, kind: 'step', step: 'disconnected' },
    { at: 2700, kind: 'message', id: 'lost-during-outage', user: 1, text: commands.coral },
    { at: 3500, kind: 'step', step: 'reconnected' },
    { at: 3700, kind: 'message', id: 'after-reconnect', user: 3, text: commands.coral },
    { at: 3900, kind: 'message', id: 'final', user: 4, text: commands.mint },
    { at: 4300, kind: 'step', step: 'quiet' },
    { at: 5500, kind: 'step', step: 'complete' },
  ];
}
export class SimulationRun {
  private timers: ReturnType<typeof setTimeout>[] = [];
  constructor(private readonly commands: TeamKeywords, private readonly onStep: (step: SimulationProgress['step']) => void, private readonly onRawMessage: (value: unknown, timestamp: string) => void, private readonly runId: number) {}
  start() {
    const startedAt = Date.now();
    for (const action of simulationPlan(this.commands)) this.timers.push(setTimeout(() => {
      if (action.kind === 'step') this.onStep(action.step);
      else if (action.kind === 'invalid') this.onRawMessage({ message: { text: null } }, new Date(startedAt + action.at).toISOString());
      else this.onRawMessage({ broadcaster_user_id: 'simulation-channel', message_id: `run-${this.runId}-${action.id}`, chatter_user_id: `test-user-${action.user}`, chatter_user_name: `Test chatter ${action.user}`, message: { text: action.text } }, new Date(startedAt + action.at).toISOString());
    }, action.at));
  }
  stop() { for (const timer of this.timers) clearTimeout(timer); this.timers = []; }
}
