"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreEvents = exports.eventEnvelopeSchema = exports.SUBJECT_PREFIX = void 0;
exports.subjectFor = subjectFor;
const zod_1 = require("zod");
/**
 * Canonical event subject format: `bellasos.<domain>.<entity>.<action>`.
 * The short `type` (e.g. `research.completed`) is the developer-facing name.
 */
exports.SUBJECT_PREFIX = 'bellasos';
function subjectFor(type) {
    return `${exports.SUBJECT_PREFIX}.${type.split('.').join('.')}`;
}
exports.eventEnvelopeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string().min(1),
    version: zod_1.z.number().int().positive(),
    source: zod_1.z.string().min(1),
    traceId: zod_1.z.string().min(1),
    actorId: zod_1.z.string().optional(),
    occurredAt: zod_1.z.string().datetime(),
    payload: zod_1.z.unknown(),
});
/** Well-known platform events (extended by modules/agents). */
exports.CoreEvents = {
    ModuleInstalled: 'module.installed',
    ModuleEnabled: 'module.enabled',
    ModuleDisabled: 'module.disabled',
    ModuleUninstalled: 'module.uninstalled',
    UserSpeaking: 'user.speaking',
    VoiceCommand: 'voice.command',
    ResearchCompleted: 'research.completed',
    PortfolioUpdated: 'portfolio.updated',
    CameraMotionDetected: 'camera.motion_detected',
    SocialPostCreated: 'social.post_created',
    AgentReportGenerated: 'agent.report_generated',
    AgentTaskAssigned: 'agent.task.assigned',
    ApprovalRequested: 'approval.requested',
    ApprovalResolved: 'approval.resolved',
    NotificationCreated: 'notification.created',
};
//# sourceMappingURL=events.js.map