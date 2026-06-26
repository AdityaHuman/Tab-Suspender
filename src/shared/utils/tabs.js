import { storage } from '../storage/index.js';
import { SETTING_KEYS } from '../constants/settings.js';
import { urlUtils } from './urls.js';

export const tabUtils = {
  isValidTab(tab) {
    return tab && tab.id && tab.id !== chrome.tabs.TAB_ID_NONE;
  },

  isSuspendedTab(tab) {
    return urlUtils.isSuspendedUrl(urlUtils.getTabUrl(tab));
  },

  isDiscardedTab(tab) {
    return tab.discarded;
  },

  isSpecialTab(tab) {
    const url = urlUtils.getTabUrl(tab);
    if (!url) return false;
    if (this.isSuspendedTab(tab)) return false;
    return urlUtils.isSpecialUrl(url);
  },

  async isProtectedTab(tab, force = false) {
    if (force) return false;
    
    const s = await storage.getSettings();

    if (s[SETTING_KEYS.IGNORE_PINNED] && tab.pinned) return true;
    if (s[SETTING_KEYS.IGNORE_AUDIO] && tab.audible) return true;
    if (s[SETTING_KEYS.IGNORE_ACTIVE_TABS] && tab.active) return true;

    // Check for unsaved forms
    if (s[SETTING_KEYS.IGNORE_FORMS]) {
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'reportTabState' });
        if (response && response.hasUnsavedInput) {
          return true;
        }
      } catch (e) {
        // Content script might not be injected or page doesn't support it
      }
    }

    return false;
  },

  async isSuspendableTab(tab, force = false) {
    if (!this.isValidTab(tab)) return false;
    if (this.isSuspendedTab(tab)) return false;
    if (this.isDiscardedTab(tab)) return false;
    if (this.isSpecialTab(tab)) return false;
    if (await this.isProtectedTab(tab, force)) return false;
    if (!force && await urlUtils.isWhitelisted(urlUtils.getTabUrl(tab))) return false;
    
    return true;
  },

  getCleanTabTitle(tab) {
    if (this.isSuspendedTab(tab)) {
      return urlUtils.getSuspendedTitle(urlUtils.getTabUrl(tab)) || urlUtils.getOriginalUrl(urlUtils.getTabUrl(tab));
    }
    return tab.title || urlUtils.getTabUrl(tab);
  }
};
