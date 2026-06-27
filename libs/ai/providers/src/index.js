"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAICompatibleProvider = void 0;
exports.createProviders = createProviders;
const mock_1 = require("./mock");
const openai_1 = require("./openai");
Object.defineProperty(exports, "OpenAICompatibleProvider", { enumerable: true, get: function () { return openai_1.OpenAICompatibleProvider; } });
const anthropic_1 = require("./anthropic");
const google_1 = require("./google");
const ollama_1 = require("./ollama");
__exportStar(require("./util"), exports);
__exportStar(require("./mock"), exports);
__exportStar(require("./openai"), exports);
__exportStar(require("./anthropic"), exports);
__exportStar(require("./google"), exports);
__exportStar(require("./credentials"), exports);
__exportStar(require("./ollama"), exports);
/** Build the full set of provider adapters keyed by provider type. */
function createProviders() {
    const providers = [
        (0, openai_1.createOpenAIProvider)(),
        new anthropic_1.AnthropicProvider(),
        new google_1.GoogleProvider(),
        (0, openai_1.createDeepSeekProvider)(),
        new ollama_1.OllamaProvider(),
        new mock_1.MockProvider(),
    ];
    const map = new Map();
    for (const p of providers)
        map.set(p.type, p);
    return map;
}
//# sourceMappingURL=index.js.map