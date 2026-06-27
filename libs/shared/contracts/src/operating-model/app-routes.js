"use strict";
/** User-facing app paths (not dev-gated Command Center). */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEALTH_APP_URL = exports.INTELLIGENCE_APP_URL = exports.STANDALONE_APP_ROUTES = exports.MODULE_APP_SLUGS = void 0;
exports.moduleAppSlug = moduleAppSlug;
exports.moduleAppUrl = moduleAppUrl;
exports.userAppUrl = userAppUrl;
exports.slugToModuleId = slugToModuleId;
exports.isVentureAppSlug = isVentureAppSlug;
exports.MODULE_APP_SLUGS = {
    'bellasos.research': 'research',
    'bellasos.intelligence': 'intelligence',
    'bellasos.coding': 'coding',
    'bellasos.automation': 'automation',
    'bellasos.social': 'communications',
    'bellasos.voice': 'voice',
    'bellasos.camera': 'camera',
};
exports.STANDALONE_APP_ROUTES = {
    wealth: '/finance',
    'finance-tracker': '/finance',
    'bellasos.portfolio': '/finance',
    'bellasos.finance': '/finance',
    'bellasos.finance-tracker': '/finance',
    'ai.studio': '/ai',
    'bellasos.llm': '/ai',
    research: '/apps/research',
    intelligence: '/apps/intelligence',
    automation: '/apps/automation',
    'coding-studio': '/apps/coding',
    communications: '/apps/communications',
    'harvi-and-co': '/apps/harvi-and-co',
    truafrica: '/apps/truafrica',
};
const PRIMARY_TO_MODULE = {
    research: 'bellasos.research',
    intelligence: 'bellasos.intelligence',
    automation: 'bellasos.automation',
    'coding-studio': 'bellasos.coding',
    communications: 'bellasos.social',
};
function moduleAppSlug(moduleId) {
    return exports.MODULE_APP_SLUGS[moduleId] ?? moduleId.replace(/^bellasos\./, '');
}
function moduleAppUrl(moduleId) {
    const standalone = exports.STANDALONE_APP_ROUTES[moduleId];
    if (standalone)
        return standalone;
    return `/apps/${moduleAppSlug(moduleId)}`;
}
function userAppUrl(appId, extra) {
    if (appId === 'wealth' && extra?.section) {
        return `/finance/${extra.section}`;
    }
    const direct = exports.STANDALONE_APP_ROUTES[appId];
    if (direct)
        return direct;
    if (appId.startsWith('bellasos.')) {
        return moduleAppUrl(appId);
    }
    const moduleId = PRIMARY_TO_MODULE[appId];
    if (moduleId)
        return moduleAppUrl(moduleId);
    return '/';
}
function slugToModuleId(slug) {
    for (const [moduleId, mapped] of Object.entries(exports.MODULE_APP_SLUGS)) {
        if (mapped === slug)
            return moduleId;
    }
    return null;
}
function isVentureAppSlug(slug) {
    return slug === 'harvi-and-co' || slug === 'truafrica';
}
/** Intelligence app route for signals and today items. */
exports.INTELLIGENCE_APP_URL = '/apps/intelligence';
/** Wealth app route for signals and today items. */
exports.WEALTH_APP_URL = '/finance';
//# sourceMappingURL=app-routes.js.map