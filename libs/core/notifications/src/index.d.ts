import type { EventBus } from '@bellasos/contracts';
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';
export interface NotificationInput {
    userId: string;
    title: string;
    body?: string;
    level?: NotificationLevel;
    source?: string;
}
export interface Notification extends Required<NotificationInput> {
    id: string;
    read: boolean;
    createdAt: string;
}
/** Creates user-facing notifications and emits `notification.created` events. */
export declare class NotificationService {
    private readonly events?;
    private readonly memory;
    constructor(events?: EventBus | undefined);
    create(input: NotificationInput): Promise<Notification>;
    list(userId: string, limit?: number): Promise<Notification[]>;
}
//# sourceMappingURL=index.d.ts.map