export const browserAPI = typeof browser !== "undefined" ? browser : chrome;

export async function getCurrentTabInfo() {
  const tabs = await browserAPI.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tab = tabs && tabs[0];

  if (!tab) {
    return { id: "", url: "", title: "" };
  }

  return tab;
}

function useChromeStorage() {
  return typeof chrome !== "undefined" && !!browserAPI.storage;
}

export function getStorageItem(key) {
  if (useChromeStorage()) {
    const result = browserAPI.storage.local.get([key]);
    return result.then((data) => data[key]);
  } else {
    return Promise.resolve(localStorage.getItem(key));
  }
}

export function setStorageItem(key, value) {
  if (useChromeStorage()) {
    return browserAPI.storage.local.set({ [key]: value });
  } else {
    localStorage.setItem(key, value);
    return Promise.resolve();
  }
}

export function openOptions() {
  browserAPI.runtime.openOptionsPage();
  window.close();
}

export function showStarredBadge(tabId) {
  const browser = browserAPI;
  const action = browser.browserAction || browser.action;
  action.setBadgeText({ text: "★", tabId: tabId });
  action.setBadgeTextColor({ color: "#FFE234", tabId: tabId });
  action.setBadgeBackgroundColor({
    color: "rgba(100,100,100,1)",
    tabId: tabId,
  });
}

export function removeStarredBadge(tabId) {
  const browser = browserAPI;
  const action = browser.browserAction || browser.action;
  action.setBadgeText({ text: "", tabId: tabId });
}
