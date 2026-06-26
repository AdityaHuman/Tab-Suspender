export async function applyStoredTheme(storageModule, SETTING_KEYS) {
  const theme = await storageModule.getOption(SETTING_KEYS.THEME);
  applyThemeValue(theme);
}

export function applyThemeValue(theme) {
  document.body.classList.remove('light', 'dark');
  const resolved = theme === 'system'
    ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.body.classList.add(resolved);
}
