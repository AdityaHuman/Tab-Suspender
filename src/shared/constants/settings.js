export const SETTING_KEYS = {
  UNSUSPEND_ON_FOCUS: 'gsUnsuspendOnFocus',
  SUSPEND_TIME: 'gsTimeToSuspend',
  IGNORE_WHEN_OFFLINE: 'onlineCheck',
  IGNORE_WHEN_ON_BATTERY: 'batteryCheck',
  IGNORE_PINNED: 'gsDontSuspendPinned',
  IGNORE_FORMS: 'gsDontSuspendForms',
  IGNORE_AUDIO: 'gsDontSuspendAudio',
  IGNORE_ACTIVE_TABS: 'gsDontSuspendActiveTabs',
  ADD_CONTEXT: 'gsAddContextMenu',
  THEME: 'gsTheme',
  WHITELIST: 'gsWhitelist',
};

export const DEFAULT_SETTINGS = {
  [SETTING_KEYS.IGNORE_WHEN_OFFLINE]: false,
  [SETTING_KEYS.IGNORE_WHEN_ON_BATTERY]: false,
  [SETTING_KEYS.UNSUSPEND_ON_FOCUS]: false,
  [SETTING_KEYS.IGNORE_PINNED]: true,
  [SETTING_KEYS.IGNORE_FORMS]: true,
  [SETTING_KEYS.IGNORE_AUDIO]: true,
  [SETTING_KEYS.IGNORE_ACTIVE_TABS]: true,
  [SETTING_KEYS.ADD_CONTEXT]: true,
  [SETTING_KEYS.SUSPEND_TIME]: '60',
  [SETTING_KEYS.WHITELIST]: '',
  [SETTING_KEYS.THEME]: 'system',
};
