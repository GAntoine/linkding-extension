import { browserAPI, getCurrentTabInfo, showStarredBadge, removeStarredBadge } from "./browser";
import { loadTabMetadata, clearCachedTabMetadata } from "./cache";
import { getConfiguration, isConfigurationComplete } from "./configuration";
import { LinkdingApi } from "./linkding";

let api = null;
let configuration = null;
let hasCompleteConfiguration = false;

async function initApi() {
  if (api) {
    return true;
  }

  configuration = await getConfiguration();
  hasCompleteConfiguration = isConfigurationComplete(configuration);

  if (hasCompleteConfiguration) {
    api = new LinkdingApi(configuration);
  } else {
    api = null;
  }

  return api !== null;
}

/* Dynamic badge */
async function setDynamicBadge(tabId, tabMetadata) {
  // Set badge if tab is bookmarked
  if (tabMetadata?.bookmark) {
    showStarredBadge(tabId);
  } else {
    removeStarredBadge(tabId);
  }
}

/* Omnibox / Search integration */

browserAPI.omnibox.onInputStarted.addListener(async () => {
  const isReady = await initApi();
  const description = isReady
    ? "Search bookmarks in linkding"
    : "⚠️ Please configure the linkding extension first";

  browserAPI.omnibox.setDefaultSuggestion({ description });
});

browserAPI.omnibox.onInputChanged.addListener((text, suggest) => {
  if (!api) {
    return;
  }

  api
    .search(text, { limit: 5 })
    .then((results) => {
      const bookmarkSuggestions = results.map((bookmark) => ({
        content: bookmark.url,
        description: bookmark.title || bookmark.website_title || bookmark.url,
      }));
      suggest(bookmarkSuggestions);
    })
    .catch((error) => {
      console.error(error);
    });
});

browserAPI.omnibox.onInputEntered.addListener(async (content, disposition) => {
  if (!hasCompleteConfiguration || !content) {
    return;
  }

  const isUrl = /^http(s)?:\/\//.test(content);
  const url = isUrl
    ? content
    : `${configuration.baseUrl}/bookmarks?q=${encodeURIComponent(content)}`;

  // Edge doesn't allow updating the New Tab Page (tested with version 117).
  // Trying to do so will throw: "Error: Cannot update NTP tab."
  // As a workaround, open a new tab instead.
  if (disposition === "currentTab") {
    const tabInfo = await getCurrentTabInfo();
    if (tabInfo.url === "edge://newtab/") {
      disposition = "newForegroundTab";
    }
  }

  switch (disposition) {
    case "currentTab":
      browserAPI.tabs.update({ url });
      break;
    case "newForegroundTab":
      browserAPI.tabs.create({ url });
      break;
    case "newBackgroundTab":
      browserAPI.tabs.create({ url, active: false });
      break;
  }
});

/* Precache bookmark / website metadata when tab or URL changes */

browserAPI.tabs.onActivated.addListener(async (activeInfo) => {
  const tabInfo = await getCurrentTabInfo();
  let tabMetadata = await loadTabMetadata(tabInfo.url, true);
  setDynamicBadge(activeInfo.tabId, tabMetadata);
});

browserAPI.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only interested in URL changes
  // Ignore URL changes in non-active tabs
  if (!changeInfo.url || !tab.active) {
    return;
  }

  let tabMetadata = await loadTabMetadata(tab.url, true);
  setDynamicBadge(tabId, tabMetadata);
});

/* Context menu integration */

async function saveToLinkding(info, tab) {
  const isReady = await initApi();
  if (!isReady) return;

  const urlMetadata = await loadTabMetadata(info.linkUrl);
  if (!urlMetadata) return;

  // Check if bookmark already exists
  if (urlMetadata.bookmark) {
    browserAPI.notifications.create("linkding-bookmark-exists", {
      type: "basic",
      iconUrl: browserAPI.runtime.getURL("/icons/logo_48x48.png"),
      title: "Linkding",
      message: `Bookmark already saved`,
      silent: true, // Prevents notification sound
    });
    return;
  }

  const { description, title, url } = urlMetadata.metadata;
  const tagNames =
    api.default_tags
      ?.split(" ")
      .map((tag) => tag.trim())
      .filter((tag) => !!tag) ?? [];

  const bookmark = {
    url,
    title: title ?? "",
    description: description ?? "",
    tag_names: tagNames,
  };

  try {
    await api.saveBookmark(bookmark);
    await clearCachedTabMetadata();

    browserAPI.notifications.create("linkding-bookmark-saved", {
      type: "basic",
      iconUrl: browserAPI.runtime.getURL("/icons/logo_48x48.png"),
      title: "Linkding",
      message: `Saved bookmark "${bookmark.title}"`,
      silent: true, // Prevents notification sound
    });
  } catch (e) {
    console.error(e);
  }
}

// Removing all context menu items first is safer to avoid duplicates
browserAPI.contextMenus.removeAll(() => {
  browserAPI.contextMenus.create({
    id: "save-to-linkding",
    title: "Save bookmark",
    contexts: ["link"],
  });
});

browserAPI.contextMenus.onClicked.addListener(saveToLinkding);
