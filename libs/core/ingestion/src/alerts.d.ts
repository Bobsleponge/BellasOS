import type { IngestDocument } from './types';
export interface AlertRule {
    id: string;
    sector: string;
    keyword: string;
}
export interface AlertMatch {
    rule: AlertRule;
    document: IngestDocument;
}
export declare function evaluateAlerts(rules: AlertRule[], docs: IngestDocument[]): AlertMatch[];
//# sourceMappingURL=alerts.d.ts.map