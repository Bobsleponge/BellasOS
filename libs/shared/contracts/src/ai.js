"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routingStrategySchema = void 0;
const zod_1 = require("zod");
exports.routingStrategySchema = zod_1.z.enum([
    'cost',
    'latency',
    'privacy',
    'quality',
]);
//# sourceMappingURL=ai.js.map