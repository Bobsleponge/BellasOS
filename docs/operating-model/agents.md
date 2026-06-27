# Agent Architecture

Jarvis is the **sole user-facing agent**. All specialists work behind Jarvis.

## Specialist Agents

| Agent | Domain | Applications |
|-------|--------|--------------|
| Jarvis | All | Orchestrator |
| Memory | Identity, Relationships | Memory gateway |
| Research | Knowledge | research |
| Intelligence | Intelligence | intelligence |
| Wealth | Wealth | finance-tracker, portfolio |
| Venture | Ventures, Execution | harvi-and-co, truafrica |
| Communications | Communications | communications |
| Environment | Environment | automation |
| Coding | Execution | coding-studio |
| Operations | Systems | Operator mode only |

## Collaboration Patterns

- Sequential handoff
- Parallel fan-out (daily briefing)
- Escalation (wealth anomaly + intelligence check)
- Human-in-loop (approvals)

## Memory Access

See `AGENT_MEMORY_ACCESS` in `agents.ts`.

Canonical catalog: `libs/shared/contracts/src/operating-model/agents.ts`
