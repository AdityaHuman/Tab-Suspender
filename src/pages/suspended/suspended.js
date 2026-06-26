import { urlUtils } from '../../shared/utils/urls.js';
import { storage } from '../../shared/storage/index.js';
import { SETTING_KEYS } from '../../shared/constants/settings.js';
import { applyStoredTheme } from '../../shared/utils/theme.js';

document.addEventListener('DOMContentLoaded', async () => {
  const currentUrl = window.location.href;
  const originalUrl = urlUtils.getOriginalUrl(currentUrl);
  const title = urlUtils.getSuspendedTitle(currentUrl) || originalUrl;

  document.title = title;
  
  const titleEl = document.getElementById('pageTitle');
  const urlEl = document.getElementById('pageUrl');
  
  if (titleEl) titleEl.innerText = title;
  if (urlEl) urlEl.innerText = originalUrl;

  // Set Theme
  await applyStoredTheme(storage, SETTING_KEYS);

  // Swap icon on hover and restore
  const snoozyIcon = document.getElementById('snoozyIcon');
  const iconWrapper = document.getElementById('restoreBtn');
  if (snoozyIcon && iconWrapper) {
    const awakeSrc = snoozyIcon.src.replace('tab-sleeping.svg', 'tab-awake.svg');
    const sleepySrc = snoozyIcon.src;
    iconWrapper.addEventListener('mouseenter', () => { snoozyIcon.src = awakeSrc; });
    iconWrapper.addEventListener('mouseleave', () => { snoozyIcon.src = sleepySrc; });
  }

  // Restore logic
  const restoreTab = () => {
    if (originalUrl) {
      if (snoozyIcon) {
        snoozyIcon.src = snoozyIcon.src.replace('tab-sleeping.svg', 'tab-awake.svg');
      }
      window.location.replace(originalUrl);
    }
  };

  document.body.addEventListener('click', restoreTab);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      restoreTab();
    }
  });

  // Show extension icon as favicon while suspended
  try {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = chrome.runtime.getURL('public/icons/icon-16.png');
  } catch (e) {}
});
