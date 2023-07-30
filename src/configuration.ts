import { getStorageItem, setStorageItem } from "./browser";

export type Config = {
  baseUrl: string;
  token: string;
  default_tags: string;
  precacheEnabled: boolean;
};

const CONFIG_KEY = "ld_ext_config";
const DEFAULT_CONFIG: Config = {
  baseUrl: "",
  token: "",
  default_tags: "",
  precacheEnabled: false,
};

export async function getConfiguration(): Promise<Config> {
  const configJson = await getStorageItem(CONFIG_KEY);
  const config = configJson ? JSON.parse(configJson) : {};

  return {
    ...DEFAULT_CONFIG,
    ...config,
  };
}

export async function saveConfiguration(config: Config) {
  const configJson = JSON.stringify(config);
  await setStorageItem(CONFIG_KEY, configJson);
}

export function isConfigurationComplete(config: Config) {
  return !!config.baseUrl && !!config.token;
}
