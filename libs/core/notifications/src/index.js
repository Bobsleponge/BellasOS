"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const contracts_1 = require("@bellasos/contracts");
const db_1 = require("@bellasos/db");
const observability_1 = require("@bellasos/observability");
const log = (0, observability_1.createLogger)({ lib: 'notifications' });
/** Creates user-facing notifications and emits `notification.created` events. */
class NotificationService {
    events;
    memory = [];
    constructor(events) {
        this.events = events;
    }
    async create(input) {
        const notification = {
            id: crypto.randomUUID(),
            userId: input.userId,
            title: input.title,
            body: input.body ?? '',
            level: input.level ?? 'info',
            source: input.source ?? 'system',
            read: false,
            createdAt: new Date().toISOString(),
        };
        this.memory.push(notification);
        if (this.memory.length > 500)
            this.memory.shift();
        if ((0, db_1.isDbAvailable)()) {
            try {
                await (0, db_1.getDb)()
                    .insertInto('core.notifications')
                    .values({
                    user_id: notification.userId,
                    title: notification.title,
                    body: notification.body,
                    level: notification.level,
                    read: false,
                    source: notification.source,
                })
                    .execute();
            }
            catch (err) {
                log.error('notification persist failed', {
                    error: err.message,
                });
            }
        }
        await this.events?.publish(contracts_1.CoreEvents.NotificationCreated, notification);
        return notification;
    }
    async list(userId, limit = 50) {
        return this.memory
            .filter((n) => n.userId === userId)
            .slice(-limit)
            .reverse();
    }
}
exports.NotificationService = NotificationService;
//# sourceMappingURL=index.js.map