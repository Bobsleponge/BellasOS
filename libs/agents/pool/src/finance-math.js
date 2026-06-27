"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.looksLikeFinanceMath = looksLikeFinanceMath;
exports.extractFinanceMathFacts = extractFinanceMathFacts;
exports.buildFinanceMathMessage = buildFinanceMathMessage;
exports.plainFinanceMathMessage = plainFinanceMathMessage;
exports.isLiveMarketDataQuestion = isLiveMarketDataQuestion;
exports.looksLikeInvestmentWrite = looksLikeInvestmentWrite;
const finance_investment_1 = require("./finance-investment");
function looksLikeFinanceMath(prompt) {
    const p = prompt.toLowerCase();
    return (/\b(exchange rate|usd\/zar|zar\/usd|convert|conversion|equivalent|in dollars|in usd|to usd|to zar|to rand)\b/.test(p) ||
        (/\b\d[\d,]*\s*(rand|r\b|zar)\b/.test(p) &&
            /\b(usd|dollar|convert|equivalent|worth|share|stock|nvidia|nvda|apple|aapl)\b/.test(p)) ||
        /\b(how much|what is).*\b(usd|dollar|rand|zar)\b/.test(p) ||
        /\b(correct|recalculate|wrong|incorrect).*\b(rate|convert|dollar|usd|rand)\b/.test(p));
}
function parseAmount(text) {
    const prefixed = text.match(/\bR\s*(\d[\d,]*(?:\.\d+)?)\b/i);
    if (prefixed?.[1]) {
        const n = Number(prefixed[1].replace(/,/g, ''));
        if (Number.isFinite(n) && n > 0)
            return n;
    }
    const m = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:rand|r\b|zar|usd|dollar|\$)/i);
    if (!m?.[1])
        return null;
    const n = Number(m[1].replace(/,/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
}
function parseIsoDate(text) {
    const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (iso?.[1])
        return iso[1];
    const dmy = text.match(/\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b/i);
    if (dmy) {
        const months = {
            january: '01',
            february: '02',
            march: '03',
            april: '04',
            may: '05',
            june: '06',
            july: '07',
            august: '08',
            september: '09',
            october: '10',
            november: '11',
            december: '12',
        };
        const mm = months[dmy[2].toLowerCase()];
        if (mm)
            return `${dmy[3]}-${mm}-${String(dmy[1]).padStart(2, '0')}`;
    }
    if (/\btoday\b/i.test(text)) {
        return new Date().toISOString().split('T')[0];
    }
    return null;
}
function extractFinanceMathFacts(prompt) {
    const lower = prompt.toLowerCase();
    const amountZar = parseAmount(prompt) ??
        (/\b\d[\d,]*\s*(rand|r\b|zar)\b/i.test(prompt) ? parseAmount(prompt) : null);
    const amountUsd = /\b\d[\d,]*\s*(usd|dollar|\$)/i.test(prompt)
        ? parseAmount(prompt.replace(/rand|zar|\br\b/gi, ''))
        : null;
    return {
        amountZar,
        amountUsd,
        symbol: (0, finance_investment_1.extractSecurityQuery)(prompt),
        date: parseIsoDate(prompt),
        wantsExchangeRate: /\b(exchange rate|usd\/zar|what.*rate|current rate)\b/i.test(lower),
        wantsZarToUsd: /\b(convert|equivalent|in dollars|in usd|to usd|back into dollars)\b/i.test(lower) ||
            (amountZar != null && /\b(dollar|usd|\$)\b/i.test(lower)),
        wantsUsdToZar: amountUsd != null && /\b(rand|zar|r\b)\b/i.test(lower),
        wantsShareEstimate: amountZar != null &&
            (/\b(share|shares|stock|stocks|nvidia|nvda|apple|aapl|bought|buy|purchase)\b/i.test(lower) ||
                (0, finance_investment_1.extractSecurityQuery)(prompt) != null),
    };
}
function fmtZar(n) {
    return `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtUsd(n) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function buildFinanceMathMessage(input) {
    const { facts, rate, rateSource, quote } = input;
    const parts = [];
    const computed = {
        usdZarRate: rate,
        rateSource: rateSource ?? null,
    };
    if (facts.wantsExchangeRate || rate) {
        parts.push(`Live USD/ZAR: **${rate.toFixed(4)}**${rateSource ? ` (${rateSource})` : ''}.`);
    }
    if (facts.amountZar != null && (facts.wantsZarToUsd || facts.wantsShareEstimate)) {
        const usd = facts.amountZar / rate;
        computed.amountZar = facts.amountZar;
        computed.amountUsd = Math.round(usd * 100) / 100;
        parts.push(`${fmtZar(facts.amountZar)} = **${fmtUsd(usd)}** at ${rate.toFixed(4)} USD/ZAR.`);
    }
    if (facts.amountUsd != null && facts.wantsUsdToZar) {
        const zar = facts.amountUsd * rate;
        computed.amountUsd = facts.amountUsd;
        computed.amountZar = Math.round(zar * 100) / 100;
        parts.push(`${fmtUsd(facts.amountUsd)} = **${fmtZar(zar)}** at ${rate.toFixed(4)} USD/ZAR.`);
    }
    if (facts.amountZar != null && facts.wantsShareEstimate && quote) {
        const priceUsd = quote.open ?? quote.price;
        if (priceUsd && priceUsd > 0) {
            const currency = quote.currency ?? 'USD';
            const zarPerShare = currency === 'ZAR' ? priceUsd : priceUsd * rate;
            const shares = facts.amountZar / zarPerShare;
            computed.symbol = quote.symbol ?? facts.symbol;
            computed.priceUsd = priceUsd;
            computed.zarPerShare = Math.round(zarPerShare * 100) / 100;
            computed.estimatedShares = Math.round(shares * 10000) / 10000;
            parts.push(`${quote.name ?? quote.symbol ?? facts.symbol}: ${currency === 'ZAR' ? fmtZar(priceUsd) : fmtUsd(priceUsd)} per share -> about **${computed.estimatedShares} shares** for ${fmtZar(facts.amountZar)} (~${fmtZar(zarPerShare)}/share in ZAR).`);
        }
    }
    if (parts.length === 0) {
        parts.push(`Live USD/ZAR is ${rate.toFixed(4)}. Tell me a Rand or USD amount to convert.`);
    }
    return { message: parts.join(' '), computed };
}
function plainFinanceMathMessage(message) {
    return message.replace(/\*\*/g, '');
}
function isLiveMarketDataQuestion(text) {
    return /\b(stock price|share price|opening price|open price|exchange rate|usd\/zar|market data|real-?time access|current price|provide.*price|confirm.*price|in south african rands)\b/i.test(text);
}
function looksLikeInvestmentWrite(prompt) {
    return (/\bsmart transaction\b/i.test(prompt) ||
        (/\b(log|record|add|create|make|buy|purchase|initiate|do)\b/i.test(prompt) &&
            /\b(stock|share|shares|investment|transaction|intel|nvidia|nvda|apple|aapl|\d+\s*(rand|r\b)|r\s*\d)/i.test(prompt)));
}
//# sourceMappingURL=finance-math.js.map