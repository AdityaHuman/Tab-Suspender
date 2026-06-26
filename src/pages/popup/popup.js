import { tabUtils } from '../../shared/utils/tabs.js';
import { urlUtils } from '../../shared/utils/urls.js';
import { storage } from '../../shared/storage/index.js';
import { SETTING_KEYS } from '../../shared/constants/settings.js';
import { applyStoredTheme } from '../../shared/utils/theme.js';

document.addEventListener('DOMContentLoaded', async () => {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const allHighlighted = await chrome.tabs.query({ highlighted: true, currentWindow: true });

  const statusDetail = document.getElementById('statusDetail');
  const suspendOne = document.getElementById('suspendOne');
  const unsuspendOne = document.getElementById('unsuspendOne');
  const optsSelected = document.getElementById('optsSelected');

  // Set Theme
  await applyStoredTheme(storage, SETTING_KEYS);

  // Set Status text & visibility
  if (!currentTab) {
    statusDetail.innerText = "Unknown Status";
    return;
  }

  const isSuspended = tabUtils.isSuspendedTab(currentTab);
  const isDiscarded = tabUtils.isDiscardedTab(currentTab);
  const isSuspendable = await tabUtils.isSuspendableTab(currentTab);
  const isSpecial = tabUtils.isSpecialTab(currentTab);

  if (isSuspended) {
    statusDetail.innerText = "Tab is suspended";
    suspendOne.classList.add('hidden');
    unsuspendOne.classList.remove('hidden');
  } else if (isDiscarded) {
    statusDetail.innerText = "Tab is natively discarded";
    suspendOne.classList.add('hidden');
    unsuspendOne.classList.add('hidden');
  } else if (!isSuspendable) {
    statusDetail.innerText = isSpecial ? "Cannot suspend internal pages" : "Tab is protected/whitelisted";
    suspendOne.classList.add('hidden');
    unsuspendOne.classList.add('hidden');
  } else {
    statusDetail.innerText = "Tab is active";
    suspendOne.classList.remove('hidden');
    unsuspendOne.classList.add('hidden');
  }

  if (allHighlighted.length > 1) {
    optsSelected.classList.remove('hidden');
  }

  const bindClick = (id, action) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', async () => {
      await action();
      window.close();
    });
  };

  bindClick('suspendOne', async () => {
    // Send message to SW or do it here
    chrome.runtime.sendMessage({ action: 'suspendTab', tabId: currentTab.id });
  });

  bindClick('unsuspendOne', async () => {
    chrome.runtime.sendMessage({ action: 'unsuspendTab', tabId: currentTab.id });
  });

  bindClick('whitelistDomain', async () => {
    const url = urlUtils.getTabUrl(currentTab);
    let domain;
    try {
      domain = new URL(url).hostname;
    } catch (e) {
      return;
    }
    if (!domain) return;
    
    const current = await storage.getOption(SETTING_KEYS.WHITELIST) || '';
    const lines = current.split(/[\s\n]+/).filter(Boolean);
    if (!lines.includes(domain)) {
      lines.push(domain);
    }
    await storage.setOption(SETTING_KEYS.WHITELIST, lines.join('\n'));
  });

  bindClick('suspendSelected', () => { chrome.runtime.sendMessage({ action: 'suspendSelected' }); });
  bindClick('unsuspendSelected', () => { chrome.runtime.sendMessage({ action: 'unsuspendSelected' }); });
  bindClick('suspendAll', () => { chrome.runtime.sendMessage({ action: 'suspendOther' }); });
  bindClick('unsuspendAll', () => { chrome.runtime.sendMessage({ action: 'unsuspendAll' }); });

  bindClick('settingsLink', () => {
    chrome.runtime.openOptionsPage();
  });
});
