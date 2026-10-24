import type { CefrLevel } from "../../lib/placementService";
interface Persisted {
    sessionId: string;
    level: CefrLevel;
}
export declare function save(data: Persisted): void;
export declare function load(): Persisted | null;
export declare function clear(): void;
export {};
