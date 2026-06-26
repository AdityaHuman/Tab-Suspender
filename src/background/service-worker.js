import { storage } from '../shared/storage/index.js';
import { SETTING_KEYS } from '../shared/constants/settings.js';
import { logger } from '../shared/utils/logger.js';
import { suspensionManager } from '../features/suspension/manager.js';
import { autoSuspend } from '../features/suspension/auto-suspend.js';
import { tabUtils } from '../shared/utils/tabs.js';

// ---- Initialization ----

let buildingMenu = false;

(async () => {
  try {
    await buildContextMenu();

    // Start auto-suspend timers for all already-open inactive tabs
    const allTabs = await chrome.tabs.query({});
    for (const t of allTabs) {
      if (!t.active) {
        await autoSuspend.startTimer(t);
      }
    }
  } catch (e) {
    logger.error('sw', 'Initialization failed', e);
  }
})();

chrome.runtime.onInstalled.addListener(async (details) => {
  logger.log('service-worker', `Extension installed/updated. Reason: ${details.reason}`);
  const alarms = await chrome.alarms.getAll();
  for (const a of alarms) {
    if (a.name.startsWith('auto-suspend-')) await chrome.alarms.clear(a.name);
  }
  await buildContextMenu();

  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/about/about.html') });
  }
});

// ---- Context Menus ----

async function buildContextMenu() {
  if (buildingMenu) return;
  buildingMenu = true;
  try {
    await new Promise(resolve => chrome.contextMenus.removeAll(resolve));
    const addContext = await storage.getOption(SETTING_KEYS.ADD_CONTEXT);
    if (!addContext) return;

    await new Promise(resolve => chrome.contextMenus.create({
      id: 'suspend-tab',
      title: 'Suspend/Unsuspend active tab',
      contexts: ['page']
    }, resolve));
    await new Promise(resolve => chrome.contextMenus.create({
      id: 'suspend-all-windows',
      title: 'Force suspend all tabs in all windows',
      contexts: ['page']
    }, resolve));
  } finally {
    buildingMenu = false;
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'suspend-tab' && tab) {
    await suspensionManager.toggleTab(tab);
  } else if (info.menuItemId === 'suspend-all-windows') {
    await suspensionManager.suspendAll(true);
  }
});

// ---- Commands (Keyboard Shortcuts) ----

chrome.commands.onCommand.addListener(async (command, tab) => {
  logger.log('service-worker', `Command received: ${command}`);
  if (!tab || !tab.id) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = tabs[0];
  }

  switch (command) {
    case 'toggle-suspend-tab':
      if (tab) await suspensionManager.toggleTab(tab);
      break;
    case 'toggle-domain-whitelist':
      if (tab) await suspensionManager.toggleTempWhitelist(tab);
      break;
    case 'suspend-selected': {
      const selected = await chrome.tabs.query({ highlighted: true, currentWindow: true });
      for (const t of selected) await suspensionManager.suspendTab(t);
      break;
    }
    case 'unsuspend-selected': {
      const selected = await chrome.tabs.query({ highlighted: true, currentWindow: true });
      for (const t of selected) await suspensionManager.unsuspendTab(t);
      break;
    }
    case 'suspend-other-tabs':
      if (tab) await suspensionManager.suspendWindow(tab.windowId, false);
      break;
    case 'force-suspend-other-tabs':
      if (tab) await suspensionManager.suspendWindow(tab.windowId, true);
      break;
    case 'unsuspend-window':
      if (tab) await suspensionManager.unsuspendWindow(tab.windowId);
      break;
    case 'suspend-all':
      await suspensionManager.suspendAll(false);
      break;
    case 'force-suspend-all':
      await suspensionManager.suspendAll(true);
      break;
    case 'unsuspend-all':
      await suspensionManager.unsuspendAll();
      break;
  }
});

// ---- Tab Lifecycle (Auto-Suspend logic) ----

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (!tab.active) {
      await autoSuspend.startTimer(tab);
    } else {
      autoSuspend.cancelTimer(tabId);
    }

    // Restore scroll position after unsuspension
    const scrollKey = `scrollRestore_${tabId}`;
    const pendingScroll = await storage.getLocal(scrollKey);
    if (pendingScroll) {
      try {
        await chrome.tabs.sendMessage(tabId, { action: 'restoreScroll', scrollPos: pendingScroll });
        await storage.removeLocal(scrollKey);
      } catch (e) {
        // Content script not ready yet — keep the key for next onUpdated fire
      }
    }
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  autoSuspend.cancelTimer(activeInfo.tabId);
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const unsuspendOnFocus = await storage.getOption(SETTING_KEYS.UNSUSPEND_ON_FOCUS);
    if (unsuspendOnFocus && tabUtils.isSuspendedTab(tab)) {
      await suspensionManager.unsuspendTab(tab);
    }

    // Start auto-suspend timers for all inactive tabs in this window
    const allTabs = await chrome.tabs.query({ windowId: activeInfo.windowId });
    for (const t of allTabs) {
      if (t.id !== activeInfo.tabId) {
        autoSuspend.cancelTimer(t.id);
        await autoSuspend.startTimer(t);
      }
    }
  } catch(e) {
    logger.error('service-worker', 'onActivated error', e);
  }
});

// ---- Tab Cleanup ----

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await storage.removeLocal(`scrollRestore_${tabId}`);
  await storage.deleteTabState(tabId);
});

// ---- Alarms ----

chrome.alarms.onAlarm.addListener((alarm) => {
  autoSuspend.handleAlarm(alarm);
});

// ---- Message Listener (from Popup/UI) ----

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  async function handleMessage() {
    if (message.action === 'suspendTab') {
      const tab = await chrome.tabs.get(message.tabId);
      await suspensionManager.suspendTab(tab);
    } else if (message.action === 'unsuspendTab') {
      const tab = await chrome.tabs.get(message.tabId);
      await suspensionManager.unsuspendTab(tab);
    } else if (message.action === 'suspendSelected') {
      const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
      for (const tab of tabs) await suspensionManager.suspendTab(tab);
    } else if (message.action === 'unsuspendSelected') {
      const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
      for (const tab of tabs) await suspensionManager.unsuspendTab(tab);
    } else if (message.action === 'suspendOther') {
      const tabs = await chrome.tabs.query({ currentWindow: true, active: false });
      for (const tab of tabs) await suspensionManager.suspendTab(tab);
    } else if (message.action === 'unsuspendAll') {
      await suspensionManager.unsuspendAll();
    } else if (message.action === 'updateContextMenu') {
      await buildContextMenu();
    }
  }
  handleMessage().then(sendResponse);
  return true;
});

