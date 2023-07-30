export const browserAPI = chrome;

export async function getCurrentTabInfo() {
  const tabs = await browserAPI.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tabs[0];
}

export function getStorageItem(key: string) {
  const result = browserAPI.storage.local.get([key]);
  return result.then((data) => data[key]);
}

export function setStorageItem(key: string, value: unknown) {
  return browserAPI.storage.local.set({ [key]: value });
}

export function openOptions() {
  browserAPI.runtime.openOptionsPage();
  window.close();
}

export function setStarredBadge(tabId: number) {
  browserAPI.action.setBadgeText({ text: "★", tabId: tabId });
  browserAPI.action.setBadgeTextColor({ color: "#FFE234", tabId: tabId });
  browserAPI.action.setBadgeBackgroundColor({ color: "#666", tabId: tabId });
  browserAPI.action.setTitle({ title: "Edit bookmark", tabId: tabId });
}

export function resetStarredBadge(tabId: number) {
  browserAPI.action.setBadgeText({ text: "", tabId: tabId });
  browserAPI.action.setTitle({ title: "Save bookmark", tabId: tabId });
}
