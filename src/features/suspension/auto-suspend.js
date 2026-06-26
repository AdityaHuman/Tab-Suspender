import { storage } from '../../shared/storage/index.js';
import { SETTING_KEYS } from '../../shared/constants/settings.js';
import { tabUtils } from '../../shared/utils/tabs.js';
import { logger } from '../../shared/utils/logger.js';
import { suspensionManager } from './manager.js';

export const autoSuspend = {
  ALARM_PREFIX: 'auto-suspend-',

  async startTimer(tab) {
    if (!await tabUtils.isSuspendableTab(tab)) {
      this.cancelTimer(tab.id);
      return;
    }

    const timeStr = await storage.getOption(SETTING_KEYS.SUSPEND_TIME);
    if (!timeStr || timeStr === 'never') {
      this.cancelTimer(tab.id);
      return;
    }

    const minutes = parseFloat(timeStr);
    if (isNaN(minutes) || minutes <= 0) return;

    chrome.alarms.create(`${this.ALARM_PREFIX}${tab.id}`, { delayInMinutes: minutes });
  },

  cancelTimer(tabId) {
    chrome.alarms.clear(`${this.ALARM_PREFIX}${tabId}`);
  },

  async handleAlarm(alarm) {
    if (alarm.name.startsWith(this.ALARM_PREFIX)) {
      const tabId = parseInt(alarm.name.replace(this.ALARM_PREFIX, ''), 10);
      try {
        const ignoreOffline = await storage.getOption(SETTING_KEYS.IGNORE_WHEN_OFFLINE);
        if (ignoreOffline && !navigator.onLine) return;

        const ignoreOnBattery = await storage.getOption(SETTING_KEYS.IGNORE_WHEN_ON_BATTERY);
        if (ignoreOnBattery) {
          try {
            const battery = await navigator.getBattery();
            if (!battery.charging) return;
          } catch (e) {
            logger.warning('auto-suspend', 'Battery API unavailable', e);
          }
        }

        const tab = await chrome.tabs.get(tabId);
        await suspensionManager.suspendTab(tab);
      } catch (e) {
        logger.warning('auto-suspend', 'Alarm handler error', e);
      }
    }
  }
};
