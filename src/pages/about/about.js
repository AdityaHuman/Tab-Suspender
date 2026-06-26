import { storage } from '../../shared/storage/index.js';
import { SETTING_KEYS } from '../../shared/constants/settings.js';
import { applyStoredTheme } from '../../shared/utils/theme.js';

document.addEventListener('DOMContentLoaded', async () => {
  await applyStoredTheme(storage, SETTING_KEYS);

  const manifest = chrome.runtime.getManifest();
  document.getElementById('versionText').innerText = `Version ${manifest.version}`;
});
