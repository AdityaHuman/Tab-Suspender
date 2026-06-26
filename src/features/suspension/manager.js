import { urlUtils } from '../../shared/utils/urls.js';
import { tabUtils } from '../../shared/utils/tabs.js';
import { logger } from '../../shared/utils/logger.js';
import { storage } from '../../shared/storage/index.js';
import { SETTING_KEYS } from '../../shared/constants/settings.js';

export const suspensionManager = {
  async toggleTempWhitelist(tab) {
    const url = urlUtils.getTabUrl(tab);
    let domain;
    try {
      domain = new URL(url).hostname;
    } catch {
      return;
    }
    if (!domain) return;

    const current = await storage.getOption(SETTING_KEYS.WHITELIST) || '';
    const lines = current.split(/[\s\n]+/).filter(Boolean);
    const idx = lines.indexOf(domain);
    if (idx >= 0) {
      lines.splice(idx, 1);
    } else {
      lines.push(domain);
    }
    await storage.setOption(SETTING_KEYS.WHITELIST, lines.join('\n'));
  },

  /**
   * Suspend a single tab
   */
  async suspendTab(tab, force = false) {
    if (!await tabUtils.isSuspendableTab(tab, force)) {
      logger.log('suspensionManager', `Tab ${tab.id} is not suspendable`);
      return false;
    }

    const title = tab.title || urlUtils.getTabUrl(tab);
    const url = urlUtils.getTabUrl(tab);
    
    let scrollPos = 0;
    try {
      const state = await chrome.tabs.sendMessage(tab.id, { action: 'reportTabState' });
      if (state && state.scrollPos) scrollPos = state.scrollPos;
    } catch (e) {
      // Content script may not be available
    }
    
    const suspendedUrl = urlUtils.generateSuspendedUrl(url, title, scrollPos);
    
    // Store metadata if we want to drop html2canvas and keep rich previews
    const metaData = {
      title,
      url,
      faviconUrl: tab.favIconUrl || '',
      suspendedAt: Date.now()
    };
    await storage.saveTabState(tab.id, metaData);

    logger.log('suspensionManager', `Suspending tab ${tab.id} - ${url}`);
    
    try {
      await chrome.tabs.update(tab.id, { url: suspendedUrl });
      return true;
    } catch (e) {
      logger.warning('suspensionManager', `Failed to update tab ${tab.id}`, e);
      return false;
    }
  },

  /**
   * Unsuspend a single tab
   */
  async unsuspendTab(tab) {
    if (!tabUtils.isSuspendedTab(tab)) {
      return false;
    }

    const suspendedUrl = urlUtils.getTabUrl(tab);
    const originalUrl = urlUtils.getOriginalUrl(suspendedUrl);
    
    if (!originalUrl) {
      logger.warning('suspensionManager', `Could not find original URL for suspended tab ${tab.id}`);
      return false;
    }

    // Store scroll position for restoration after navigation
    const scrollPos = parseInt(urlUtils.getHashVariable('pos', suspendedUrl), 10);
    if (scrollPos > 0) {
      await storage.setLocal(`scrollRestore_${tab.id}`, scrollPos);
    }

    logger.log('suspensionManager', `Unsuspending tab ${tab.id} - restoring ${originalUrl}`);
    
    try {
      await chrome.tabs.update(tab.id, { url: originalUrl });
      await storage.deleteTabState(tab.id);
      return true;
    } catch (e) {
      logger.warning('suspensionManager', `Failed to update tab ${tab.id}`, e);
      return false;
    }
  },

  /**
   * Toggle suspension state of a tab
   */
  async toggleTab(tab, force = true) {
    if (tabUtils.isSuspendedTab(tab)) {
      await this.unsuspendTab(tab);
    } else {
      await this.suspendTab(tab, force);
    }
  },

  /**
   * Suspend all tabs in a window except active
   */
  async suspendWindow(windowId, force = false) {
    const tabs = await chrome.tabs.query({ windowId });
    await Promise.all(tabs.map(tab => {
      if (!force && tab.active) return Promise.resolve();
      return this.suspendTab(tab, force);
    }));
  },

  /**
   * Unsuspend all tabs in a window
   */
  async unsuspendWindow(windowId) {
    const tabs = await chrome.tabs.query({ windowId });
    await Promise.all(tabs.map(tab => {
      if (tabUtils.isSuspendedTab(tab)) {
        return this.unsuspendTab(tab);
      }
      return Promise.resolve();
    }));
  },

  /**
   * Suspend all windows
   */
  async suspendAll(force = false) {
    const windows = await chrome.windows.getAll();
    await Promise.all(windows.map(win => this.suspendWindow(win.id, force)));
  },

  /**
   * Unsuspend all windows
   */
  async unsuspendAll() {
    const windows = await chrome.windows.getAll();
    await Promise.all(windows.map(win => this.unsuspendWindow(win.id)));
  }
};
