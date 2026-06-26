import { DEFAULT_SETTINGS } from '../constants/settings.js';

export const storage = {
  /**
   * General get/set helpers
   */
  async getLocal(key) {
    const result = await chrome.storage.local.get([key]);
    return result[key];
  },

  async setLocal(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  async removeLocal(key) {
    await chrome.storage.local.remove([key]);
  },

  async getSession(key) {
    const result = await chrome.storage.session.get([key]);
    return result[key];
  },

  async setSession(key, value) {
    await chrome.storage.session.set({ [key]: value });
  },

  async removeSession(key) {
    await chrome.storage.session.remove([key]);
  },

  /**
   * Settings API
   */
  async getSettings() {
    let settings = await this.getLocal('settings');
    if (!settings) {
      settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings(settings);
    } else {
      // Ensure missing keys have defaults
      for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
        if (typeof settings[key] === 'undefined') {
          settings[key] = val;
        }
      }
    }
    return settings;
  },

  async saveSettings(settings) {
    await this.setLocal('settings', settings);
  },

  async getOption(prop) {
    const settings = await this.getSettings();
    return settings[prop];
  },

  async setOption(prop, value) {
    const settings = await this.getSettings();
    settings[prop] = value;
    await this.saveSettings(settings);
  },

  /**
   * Tab State API
   */
  async getTabState(tabId) {
    return await this.getSession(`tab_${tabId}`);
  },

  async saveTabState(tabId, state) {
    if (!tabId) return;
    await this.setSession(`tab_${tabId}`, state);
  },

  async deleteTabState(tabId) {
    if (!tabId) return;
    await this.removeSession(`tab_${tabId}`);
  }
};
