import { SETTING_KEYS } from '../constants/settings.js';
import { storage } from '../storage/index.js';

export const urlUtils = {
  getTabUrl(tab) {
    return tab.url || tab.pendingUrl || '';
  },

  isSuspendedUrl(url) {
    if (!url) return false;
    return url.startsWith(chrome.runtime.getURL('src/pages/suspended/suspended.html'));
  },

  isSpecialUrl(url) {
    if (!url) return false;
    return url.startsWith('chrome://') || url.startsWith('about:');
  },

  generateSuspendedUrl(url, title, scrollPos = 0) {
    const encodedTitle = encodeURIComponent(title || '');
    const encodedUrl = encodeURIComponent(url);
    const args = `#ttl=${encodedTitle}&pos=${scrollPos}&uri=${encodedUrl}`;
    return chrome.runtime.getURL(`src/pages/suspended/suspended.html${args}`);
  },

  getHashVariable(key, urlStr) {
    if (!urlStr || !urlStr.includes('#')) return null;

    const hashStr = urlStr.split('#')[1];
    if (!hashStr) return null;

    const pairs = hashStr.split('&');
    for (const pair of pairs) {
      const [k, v] = pair.split('=');
      if (k === key) return v === undefined ? null : decodeURIComponent(v);
    }
    return null;
  },

  getOriginalUrl(suspendedUrl) {
    return this.getHashVariable('uri', suspendedUrl) || '';
  },

  getSuspendedTitle(suspendedUrl) {
    return this.getHashVariable('ttl', suspendedUrl) || '';
  },

  async isWhitelisted(url) {
    if (!url) return false;
    const whitelistString = await storage.getOption(SETTING_KEYS.WHITELIST) || '';
    const items = whitelistString.split(/[\s\n]+/).filter(Boolean);
    
    return items.some(item => {
      // regex match
      if (item.startsWith('/') && item.endsWith('/')) {
        try {
          const regex = new RegExp(item.slice(1, -1));
          return regex.test(url);
        } catch(e) { return false; }
      }
      // wildcard match (e.g. *.example.com)
      if (item.includes('*')) {
        const pattern = '^' + item.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
        try { return new RegExp(pattern).test(url); } catch { return false; }
      }
      // substring match
      return url.includes(item);
    });
  }
};
