"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_APP_ID_MAP = exports.ADVISORY_PLAYBOOKS = exports.APPLICATION_REGISTRY = void 0;
exports.getApplication = getApplication;
exports.getCapability = getCapability;
exports.getAdvisoryPlaybook = getAdvisoryPlaybook;
exports.listAdvisoryPlaybooks = listAdvisoryPlaybooks;
const application_registry_json_1 = __importDefault(require("./application-registry.json"));
const advisory_playbooks_json_1 = __importDefault(require("./advisory-playbooks.json"));
exports.APPLICATION_REGISTRY = application_registry_json_1.default;
exports.ADVISORY_PLAYBOOKS = advisory_playbooks_json_1.default;
function getApplication(id) {
    return exports.APPLICATION_REGISTRY.find((a) => a.id === id);
}
function getCapability(capabilityId) {
    for (const app of exports.APPLICATION_REGISTRY) {
        const capability = app.capabilities.find((c) => c.id === capabilityId);
        if (capability)
            return { application: app, capability };
    }
    return undefined;
}
function getAdvisoryPlaybook(id) {
    return exports.ADVISORY_PLAYBOOKS.find((p) => p.id === id);
}
function listAdvisoryPlaybooks() {
    return [...exports.ADVISORY_PLAYBOOKS];
}
/** Maps legacy module / shell IDs to application registry IDs. */
exports.LEGACY_APP_ID_MAP = {
    'bellasos.portfolio': 'wealth',
    'bellasos.research': 'research',
    'bellasos.intelligence': 'intelligence',
    'bellasos.social': 'communications',
    'bellasos.automation': 'automation',
    'bellasos.coding': 'coding-studio',
    'bellasos.finance-tracker': 'wealth',
    'finance-tracker': 'wealth',
    'bellasos.finance': 'wealth',
    wealth: 'wealth',
};
