<script lang="ts">
  import Form from "./form.svelte";
  import Intro from "./intro.svelte";
  import {
    getConfiguration,
    isConfigurationComplete,
    type Config,
  } from "./configuration";
  import { LinkdingApi } from "./linkding";

  let hasCompleteConfiguration = true;
  let configuration: Config;
  let api: LinkdingApi;

  async function init() {
    configuration = await getConfiguration();
    hasCompleteConfiguration = isConfigurationComplete(configuration);
    if (hasCompleteConfiguration) {
      api = new LinkdingApi(configuration);
    }
  }

  init();
</script>

<Form {configuration} {api} />

{#if !hasCompleteConfiguration}
  <div class="modal active" id="modal-id">
    <div class="modal-overlay" />
    <div class="modal-container">
      <div class="modal-body">
        <div class="content">
          <Intro />
        </div>
      </div>
    </div>
  </div>
{/if}
