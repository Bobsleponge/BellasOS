"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.symbolSearchInput = exports.quoteInput = exports.exchangeRateInput = exports.investmentAddInput = exports.transferAddInput = exports.incomeAddInput = exports.expenseAddInput = exports.limitInput = void 0;
const zod_1 = require("zod");
exports.limitInput = zod_1.z.object({
    limit: zod_1.z.number().int().positive().max(100).optional(),
});
exports.expenseAddInput = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    category: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
    merchant: zod_1.z.string().optional(),
    payment_method: zod_1.z.string().optional(),
    is_recurring: zod_1.z.boolean().optional(),
    recurring_frequency: zod_1.z.string().optional(),
});
exports.incomeAddInput = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    type: zod_1.z.string().min(1).default('salary'),
    description: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
    is_gross: zod_1.z.boolean().optional(),
    paye_amount: zod_1.z.number().nonnegative().optional(),
    net_amount: zod_1.z.number().positive().optional(),
    merchant: zod_1.z.string().optional(),
    payment_method: zod_1.z.string().optional(),
});
exports.transferAddInput = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    transfer_fee: zod_1.z.number().nonnegative().optional(),
    source_account: zod_1.z.string().optional(),
    destination_account: zod_1.z.string().optional(),
    purpose: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    date: zod_1.z.string().optional(),
});
exports.investmentAddInput = zod_1.z
    .object({
    symbol: zod_1.z.string().min(1),
    name: zod_1.z.string().optional(),
    investmentType: zod_1.z.string().default('stock'),
    accountType: zod_1.z.string().default('TFSA'),
    quantity: zod_1.z.number().positive().optional(),
    purchasePrice: zod_1.z.number().positive().optional(),
    amountZar: zod_1.z.number().positive().optional(),
    purchaseDate: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    commission: zod_1.z.number().nonnegative().optional(),
})
    .refine((d) => d.quantity != null || d.amountZar != null, {
    message: 'Either quantity or amountZar is required',
});
exports.exchangeRateInput = zod_1.z.object({
    date: zod_1.z.string().optional(),
});
exports.quoteInput = zod_1.z.object({
    symbol: zod_1.z.string().min(1),
    date: zod_1.z.string().optional(),
});
exports.symbolSearchInput = zod_1.z.object({
    query: zod_1.z.string().min(2),
});
//# sourceMappingURL=types.js.map