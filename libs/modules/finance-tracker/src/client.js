"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceTrackerClient = void 0;
exports.createFinanceTrackerClient = createFinanceTrackerClient;
const core_external_apps_1 = require("@bellasos/core-external-apps");
class FinanceTrackerClient extends core_external_apps_1.ApiKeyHttpClient {
    constructor(config = {}) {
        const env = (0, core_external_apps_1.resolveExternalAppEnv)('FINANCE_TRACKER');
        super({
            baseUrl: config.baseUrl ?? env.baseUrl ?? 'http://localhost:5000',
            apiKey: config.apiKey ?? env.apiKey,
            appName: 'Finance-Tracker',
        });
    }
    get config() {
        return {
            ...super.config,
            authMode: this.apiKey ? 'api_key' : 'none',
        };
    }
    async ping() {
        return this.request('/api/health/database', { auth: false });
    }
    async verifyConnection() {
        if (!this.apiKey) {
            throw new Error('Finance-Tracker API key is not configured. Add it in Command Centre → Portfolio.');
        }
        return super.verifyConnection();
    }
}
exports.FinanceTrackerClient = FinanceTrackerClient;
function createFinanceTrackerClient(config = {}) {
    return new FinanceTrackerClient(config);
}
//# sourceMappingURL=client.js.map