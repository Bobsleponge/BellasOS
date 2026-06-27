export interface PublishResult {
    postId: string;
    url?: string;
    platform: string;
}
export interface AnalyticsResult {
    followers?: number;
    impressions?: number;
    engagementRate?: number;
    note?: string;
    raw?: unknown;
}
export declare function publishToPlatform(platform: string, content: string, token: string): Promise<PublishResult>;
export declare function fetchPlatformAnalytics(platform: string, token: string): Promise<AnalyticsResult>;
//# sourceMappingURL=publish.d.ts.map