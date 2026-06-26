import { storage } from '../../shared/storage/index.js';
import { SETTING_KEYS } from '../../shared/constants/settings.js';
import { applyThemeValue } from '../../shared/utils/theme.js';

document.addEventListener('DOMContentLoaded', async () => {
  const inputs = {
    [SETTING_KEYS.SUSPEND_TIME]: document.getElementById('gsTimeToSuspend'),
    [SETTING_KEYS.UNSUSPEND_ON_FOCUS]: document.getElementById('gsUnsuspendOnFocus'),
    [SETTING_KEYS.IGNORE_PINNED]: document.getElementById('gsDontSuspendPinned'),
    [SETTING_KEYS.IGNORE_FORMS]: document.getElementById('gsDontSuspendForms'),
    [SETTING_KEYS.IGNORE_AUDIO]: document.getElementById('gsDontSuspendAudio'),
    [SETTING_KEYS.IGNORE_ACTIVE_TABS]: document.getElementById('gsDontSuspendActiveTabs'),
    [SETTING_KEYS.IGNORE_WHEN_OFFLINE]: document.getElementById('onlineCheck'),
    [SETTING_KEYS.IGNORE_WHEN_CHARGING]: document.getElementById('batteryCheck'),
    [SETTING_KEYS.ADD_CONTEXT]: document.getElementById('gsAddContextMenu'),
    [SETTING_KEYS.THEME]: document.getElementById('gsTheme'),
    [SETTING_KEYS.WHITELIST]: document.getElementById('gsWhitelist'),
  };

  const settings = await storage.getSettings();

  // Load current settings into UI
  for (const [key, el] of Object.entries(inputs)) {
    if (!el) continue;
    
    if (el.type === 'checkbox') {
      el.checked = !!settings[key];
    } else {
      el.value = settings[key] || '';
    }

    // Add event listeners to save on change
    el.addEventListener('change', async (e) => {
      let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      await storage.setOption(key, value);
      
      // Handle immediate effects
      if (key === SETTING_KEYS.THEME) {
        applyThemeValue(value);
      } else if (key === SETTING_KEYS.ADD_CONTEXT) {
        // Need to ping background to update context menu
        chrome.runtime.sendMessage({ action: 'updateContextMenu' });
      }
    });
  }

  applyThemeValue(settings[SETTING_KEYS.THEME]);
});
