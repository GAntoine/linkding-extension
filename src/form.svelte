<script>
  import TagAutocomplete from './TagAutocomplete.svelte'
  import {getCurrentTabInfo, openOptions, showStarredBadge, browserAPI} from "./browser";
  import {loadTabMetadata, clearCachedTabMetadata} from "./cache";
  import {getProfile, updateProfile} from "./profile";
  import {getConfiguration} from "./configuration";

  export let api;
  export let configuration;

  let url = "";
  let title = "";
  let titlePlaceholder = "";
  let descriptionPlaceholder = "";
  let description = "";
  let notes = "";
  let tags = "";
  let autoTags = "";
  let unread = false;
  let shared = false;
  let saveState = "";
  let errorMessage = "";
  let availableTagNames = []
  let bookmarkId = null;
  let editNotes = false;
  let profile = null;
  let tabInfo = null;
  let extensionConfiguration = null;

  $: {
    if (api && configuration) {
      init();
    }
  }

  async function init() {
    // First get cached user profile to quickly show something, then update it
    // in the background
    profile = await getProfile();
    updateProfile().then(updatedProfile => {
      profile = updatedProfile;
    });

    // Load available tags in the background
    tags = configuration.default_tags;
    api.getTags().catch(() => []).then(tags => {
      availableTagNames = tags.map(tag => tag.name)
    });

    // Initialize bookmark form
    await initForm();
    extensionConfiguration = await getConfiguration();
  }

  async function initForm() {
    tabInfo = await getCurrentTabInfo();
    url = tabInfo.url;

    const tabMetadata = await loadTabMetadata(url);
    if (!tabMetadata) {
      return;
    }

    // Detect highlighted text
    const highlightedText = await browserAPI.scripting.executeScript({
      target: { tabId: tabInfo.id },
      func: () => window.getSelection().toString(),
    });
    if (highlightedText?.[0]?.result) {
      // If there is highlighted text, use it as the notes
      notes = highlightedText[0].result;
    }

    titlePlaceholder = tabMetadata.metadata.title ?? "";
    descriptionPlaceholder = tabMetadata.metadata.description ?? "";
    shared = configuration.shareSelected;
    unread = configuration.unreadSelected;

    const existingBookmark = tabMetadata.bookmark;
    if (existingBookmark) {
      bookmarkId = existingBookmark.id;
      title = existingBookmark.title;
      tags = existingBookmark.tag_names
        ? existingBookmark.tag_names.join(" ")
        : "";
      description = existingBookmark.description;
      notes = existingBookmark.notes;
      unread = existingBookmark.unread;
      shared = existingBookmark.shared;
      autoTags = "";
    } else {
      // Only show auto tags for new bookmarks
      // Auto tags are only supported since v1.31.0, so we need to check if they are available
      const autoTagsList = tabMetadata.auto_tags;
      if (autoTagsList) {
        autoTags = autoTagsList.join(" ");
      }
    }
  }

  async function handleSubmit() {
    const tagNames = tags.split(" ").map(tag => tag.trim()).filter(tag => !!tag);
    const bookmark = {
      url,
      title: title || titlePlaceholder,
      description: description || descriptionPlaceholder,
      notes,
      tag_names: tagNames,
      unread,
      shared,
    };

    try {
      saveState = "loading";
      const newBookmark = await api.saveBookmark(bookmark);
      await clearCachedTabMetadata();
      saveState = "success";

      // Update the bookmark ID and title in case the user wants to edit it
      title = newBookmark.title;
      description = newBookmark.description;
      bookmarkId = newBookmark.id;

      // Show star badge on the tab to indicate that it's now bookmarked
      // but only if precaching is enabled, since the badge will never
      // show when browsing without precaching
      if (extensionConfiguration?.precacheEnabled) {
        showStarredBadge(tabInfo.id);
      }

      window.setTimeout(() => {
        saveState = "";
      }, 1750);
    } catch (e) {
      saveState = "error";
      errorMessage = e.toString();
      console.error(errorMessage);
    }
  }

  function handleOptions() {
    openOptions();
  }

  async function handleDelete() {
    if (!bookmarkId) return;
    if (!confirm("Are you sure you want to delete this bookmark?")) {
      return;
    }
    try {
      await api.deleteBookmark(bookmarkId);
      await clearCachedTabMetadata();
      bookmarkId = null;
      const tabInfo = await getCurrentTabInfo();
      resetStarredBadge(tabInfo.id);
    } catch (e) {
      saveState = "error";
      errorMessage = e.toString();
      console.error(errorMessage);
    }
  }

  function toggleNotes() {
    editNotes = !editNotes;
  }

</script>
<div class="title-row">
  <h6>{bookmarkId ? "Edit Bookmark" : "Add bookmark"}</h6>
  <div class="title-actions">
    <a
      class="title-action"
      href={`${configuration?.baseUrl}/bookmarks`}
      target="_blank"
      role="button"
      tabindex="0"
    >
      <i class="icon icon-share" />
    </a>
    <div
      class="title-action"
      on:keypress={handleOptions}
      on:click|preventDefault={handleOptions}
      role="button"
      tabindex="0"
    >
      <i class="icon icon-menu" />
    </div>
  </div>
</div>
<div class="divider" />
<form class="form" on:submit|preventDefault={handleSubmit}>
  <div class="form-group">
    <label class="form-label label-sm" for="input-url">URL</label>
    <input class="form-input input-sm" type="text" id="input-url" placeholder="URL"
           bind:value={url}>
  </div>
  <div class="form-group">
    <label class="form-label label-sm" for="input-tags">Tags</label>
    <TagAutocomplete id="input-tags" name="tags" bind:value={tags} tags={availableTagNames}/>
    {#if autoTags}
      <div class="form-input-hint text-success">
        Auto tags: {autoTags}
      </div>
    {/if}
  </div>
  <div class="form-group">
    <label class="form-label label-sm" for="input-title">Title</label>
    <input class="form-input input-sm" type="text" id="input-title"
           bind:value={title} placeholder={titlePlaceholder}>
  </div>
  <div class="form-group">
    {#if !editNotes}
      <div class="form-label-row">
        <label class="form-label label-sm" for="input-description">Description</label>
        <button type="button" class="btn btn-link btn-sm" on:click|preventDefault={toggleNotes}>Edit notes</button>
      </div>
      <textarea class="form-input input-sm" id="input-description"
                bind:value={description}
                placeholder={descriptionPlaceholder}></textarea>
    {/if}
    {#if editNotes}
      <div class="form-label-row">
        <label class="form-label label-sm" for="input-notes">Notes</label>
        <button type="button" class="btn btn-link btn-sm" on:click|preventDefault={toggleNotes}>Edit description
        </button>
      </div>
      <textarea class="form-input input-sm" id="input-notes" rows="5"
                bind:value={notes}></textarea>
    {/if}
  </div>
  <div class="form-group d-flex">
    <label class="form-checkbox">
      <input type="checkbox" bind:checked={unread}>
      <i class="form-icon"></i>
      <span class="text-small">Mark as unread</span>
    </label>
    {#if profile?.enable_sharing }
      <label class="form-checkbox ml-2">
        <input type="checkbox" bind:checked={shared}>
        <i class="form-icon"></i>
        <span class="text-small">Share</span>
      </label>
    {/if}
  </div>
  <div class="divider"></div>
  {#if saveState === 'success'}
    <div class="form-group has-success result-row">
      <div class="form-input-hint"><i class="icon icon-check"></i> Bookmark saved</div>
    </div>
  {/if}
  {#if saveState === 'error'}
    <div class="form-group has-error result-row">
      <div class="form-input-hint">{errorMessage}</div>
    </div>
  {/if}
  {#if saveState !== 'success'}
    <div class="button-row">
      {#if bookmarkId}
        <div
          class="delete-button"
          on:keypress={handleDelete}
          on:click|preventDefault={handleDelete}
          role="button"
          tabindex="0"
        >
          <i class="icon icon-delete" />
        </div>
      {/if}
      <button
        type="submit"
        class="btn btn-primary"
        class:loading={saveState === "loading"}
      >
        {#if bookmarkId}
          Update
        {:else}
          Save
        {/if}
      </button>
    </div>
  {/if}
</form>

<style>
  form {
    max-width: 400px;
  }
  .title-actions {
    display: flex;
    align-items: center;
  }
  .title-action {
    color: #fff;
    cursor: pointer;
    margin-left: 0.75rem;
  }
  .form-label-row {
    display: flex;
    justify-content: space-between;
  }
  .button-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .button-row button {
    padding-left: 32px;
    padding-right: 32px;
    margin-left: auto;
  }
  .delete-button {
    color: #e05a5b;
    cursor: pointer;
  }
  .result-row {
    display: flex;
    justify-content: center;
  }
</style>
