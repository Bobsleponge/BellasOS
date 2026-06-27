# BellasOS Notification Philosophy

Calm, low-noise notification system for 8+ hour daily use.

**Related:** [intelligence-model](./intelligence-model.md) | [operating-model/automation](../operating-model/automation.md)

---

## Philosophy

**Notifications earn their interrupt.**

Default state is calm. BellasOS batches, defers, and downgrades rather than ping repeatedly. The user trusts that if something appears, it matters.

---

## Deserves a notification

- Approval required (publish, venture write, significant financial log)
- Critical alert (user-defined threshold — security, major portfolio move)
- User-initiated research complete
- Automation failure affecting a user-visible scheduled action
- Calendar-driven meeting prep (future)

---

## Does not deserve a notification

- Connector or sync success
- Module or system health (Developer Mode only)
- Background briefing generated (appears silently on Today)
- Low-confidence intelligence
- Price refresh completion
- Routine automation success

---

## Priority levels

| Level | Channels | Persistence | Example |
|-------|----------|-------------|---------|
| **Critical** | Voice + visual + persist until acted | Until dismissed | Security-relevant alert |
| **Action** | Visual + optional voice | Until acted or snoozed | Approval waiting |
| **Info** | Today stack only | Until dismissed from Today | Briefing ready |
| **Silent** | None user-facing | N/A | Background sync |

---

## Actionable notifications

Every notification offers exactly one clear primary action:

- **Approve** / **Decline**
- **Open** (relevant application or card)
- **Snooze** (1 hour / tonight / tomorrow)
- **Dismiss**

No notification without a user path forward.

---

## Voice notifications

- Spoken only for **Critical** and **Action** when user enabled voice notifications
- Short spoken form: "Approval needed for LinkedIn draft" — not full post text
- Respects quiet hours and Focus mode
- User can disable voice notifications independently of voice conversation

---

## Anti-fatigue controls

| Control | Behavior |
|---------|----------|
| **Quiet hours** | No Critical/Action voice; Info deferred to Today |
| **Focus mode** | Suppress all non-Critical |
| **Daily budget** | User cap on Action notifications per day |
| **Jarvis batching** | "3 items need you" instead of 3 separate pings |
| **Snooze defaults** | Respect snooze until user re-enables topic |

---

## Approval workflows

Approvals are the most common Action notification:

1. Plain consequence stated
2. Primary: Approve
3. Secondary: Review, Snooze, Decline
4. On approve: optional decision memory capture for significant choices

Approvals never use technical language ("module action social.publish"). User sees: "Publish LinkedIn draft?"
