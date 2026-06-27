# Automation Architecture

## Components

Event, Trigger, Condition, Action, Approval, Workflow, Schedule, Background Intelligence

## Event Sources

- External application webhooks and polls
- Ingestion pipeline
- Agent completion events
- Environment sensors
- User lifecycle
- Calendar-like events
- Graph changes

## Background Jobs

Feed poll, price refresh, briefing generation, integration health, alert evaluation, resource ref revalidation, scheduled publish

## Approval Matrix

See `APPROVAL_MATRIX` in `automation.ts`.

Automations invoke Application capabilities - never modules directly from user-facing flows.

Canonical types: `libs/shared/contracts/src/operating-model/automation.ts`
