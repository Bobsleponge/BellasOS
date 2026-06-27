/** User-facing app paths (not dev-gated Command Center). */
export declare const MODULE_APP_SLUGS: Record<string, string>;
export declare const STANDALONE_APP_ROUTES: Record<string, string>;
export declare function moduleAppSlug(moduleId: string): string;
export declare function moduleAppUrl(moduleId: string): string;
export declare function userAppUrl(appId: string, extra?: Record<string, string>): string;
export declare function slugToModuleId(slug: string): string | null;
export declare function isVentureAppSlug(slug: string): slug is 'harvi-and-co' | 'truafrica';
/** Intelligence app route for signals and today items. */
export declare const INTELLIGENCE_APP_URL = "/apps/intelligence";
/** Wealth app route for signals and today items. */
export declare const WEALTH_APP_URL = "/finance";
//# sourceMappingURL=app-routes.d.ts.map