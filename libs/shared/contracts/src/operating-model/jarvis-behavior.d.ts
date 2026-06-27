/**
 * Jarvis daily operating system behavior specifications.
 */
import type { OperatingMode } from './context';
export declare const DAY_PHASES: readonly ["arrival", "execution", "intelligence", "synthesis", "background"];
export type DayPhase = (typeof DAY_PHASES)[number];
export interface JarvisBehaviorSpec {
    phase: DayPhase;
    jarvisBehavior: string[];
    platformBehavior: string[];
    userActions: string[];
}
export declare const DAILY_OPERATING_SPECS: JarvisBehaviorSpec[];
export interface OperatingModeSpec {
    mode: OperatingMode;
    domainEmphasis: string[];
    jarvisPosture: string;
}
export declare const OPERATING_MODE_SPECS: OperatingModeSpec[];
/** Five simultaneous lives BellasOS integrates into one narrative. */
export declare const LIFE_DIMENSIONS: readonly ["personal_life", "financial_life", "business_life", "intellectual_life", "digital_life"];
export type LifeDimension = (typeof LIFE_DIMENSIONS)[number];
export declare const LIFE_DIMENSION_DOMAINS: Record<LifeDimension, string[]>;
//# sourceMappingURL=jarvis-behavior.d.ts.map