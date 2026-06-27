"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importInput = exports.trackerRowInput = exports.investmentIdInput = exports.investmentUpdateInput = exports.investmentInput = exports.ACCOUNT_TYPES = exports.INVESTMENT_TYPES = void 0;
const zod_1 = require("zod");
exports.INVESTMENT_TYPES = [
    'stock',
    'etf',
    'bond',
    'crypto',
    'mutual_fund',
    'other',
];
exports.ACCOUNT_TYPES = ['TFSA', 'RA', 'taxable', 'pension', 'other'];
exports.investmentInput = zod_1.z.object({
    symbol: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    investmentType: zod_1.z.enum(exports.INVESTMENT_TYPES).default('stock'),
    accountType: zod_1.z.enum(exports.ACCOUNT_TYPES),
    quantity: zod_1.z.number().positive(),
    purchasePrice: zod_1.z.number().nonnegative(),
    currentPrice: zod_1.z.number().nonnegative().optional(),
    purchaseDate: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    commission: zod_1.z.number().nonnegative().optional(),
});
exports.investmentUpdateInput = exports.investmentInput.partial().extend({
    id: zod_1.z.string().min(1),
});
exports.investmentIdInput = zod_1.z.object({ id: zod_1.z.string().min(1) });
exports.trackerRowInput = zod_1.z.object({
    symbol: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    investment_type: zod_1.z.string().min(1),
    account_type: zod_1.z.string().min(1),
    quantity: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
    purchase_price: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
    current_price: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
    purchase_date: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    commission: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]).optional(),
});
exports.importInput = zod_1.z.object({
    investments: zod_1.z.array(exports.trackerRowInput),
    replace: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=types.js.map