import { browserAPI } from "./browser";
import type { Config } from "./configuration";

export type Bookmark = {
  id: number;
  url: string;
  title: string;
  description: string;
  notes: string;
  tag_names: string[];
  unread: boolean;
  date_added: string;
  website_title: string;
};

export type Tag = {
  id: number;
  name: string;
};

type ApiOptions = {
  limit?: number;
};

export class LinkdingApi {
  configuration: Config;

  constructor(configuration: Config) {
    this.configuration = configuration;
  }

  async getBookmark(bookmarkId: number): Promise<Bookmark> {
    return fetch(`${this.configuration.baseUrl}/api/bookmarks/${bookmarkId}/`, {
      headers: {
        Authorization: `Token ${this.configuration.token}`,
      },
    }).then((response) => {
      if (response.status === 200) {
        return response.json();
      }
      return Promise.reject(
        `Error retrieving bookmark: ${response.statusText}`
      );
    });
  }

  async saveBookmark(bookmark: Partial<Bookmark>): Promise<Bookmark> {
    return fetch(`${this.configuration.baseUrl}/api/bookmarks/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${this.configuration.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookmark),
    }).then((response) => {
      if (response.status === 201) {
        return response.json();
      } else if (response.status === 400) {
        return response
          .json()
          .then((body) =>
            Promise.reject(`Validation error: ${JSON.stringify(body)}`)
          );
      } else {
        return Promise.reject(`Request error: ${response.statusText}`);
      }
    });
  }

  async deleteBookmark(bookmarkId: number): Promise<boolean> {
    return fetch(`${this.configuration.baseUrl}/api/bookmarks/${bookmarkId}/`, {
      method: "DELETE",
      headers: {
        Authorization: `Token ${this.configuration.token}`,
      },
    }).then((response) => {
      if (response.status === 204) {
        return true;
      }
      return Promise.reject(`Error deleting bookmark: ${response.statusText}`);
    });
  }

  async getTags(): Promise<Tag[]> {
    return fetch(`${this.configuration.baseUrl}/api/tags/?limit=1000`, {
      headers: {
        Authorization: `Token ${this.configuration.token}`,
      },
    }).then((response) => {
      if (response.status === 200) {
        return response.json().then((body) => body.results);
      }
      return Promise.reject(`Error loading tags: ${response.statusText}`);
    });
  }

  async search(text: string, options: ApiOptions): Promise<Bookmark[]> {
    const q = encodeURIComponent(text);
    const limit = options.limit || 100;

    return fetch(
      `${this.configuration.baseUrl}/api/bookmarks/?q=${q}&limit=${limit}`,
      {
        headers: {
          Authorization: `Token ${this.configuration.token}`,
        },
      }
    ).then((response) => {
      if (response.status === 200) {
        return response.json().then((body) => body.results);
      }
      return Promise.reject(
        `Error searching bookmarks: ${response.statusText}`
      );
    });
  }

  async check(url: string): Promise<{ bookmark: Bookmark }> {
    url = encodeURIComponent(url);

    return fetch(
      `${this.configuration.baseUrl}/api/bookmarks/check/?url=${url}`,
      {
        headers: {
          Authorization: `Token ${this.configuration.token}`,
        },
      }
    ).then((response) => {
      if (response.status === 200) {
        return response.json();
      }
      return Promise.reject(
        `Error checking bookmark URL: ${response.statusText}`
      );
    });
  }

  async testConnection() {
    // Request permission to access the page that runs Linkding
    const granted = await browserAPI.permissions.request({
      origins: [`${this.configuration.baseUrl}/*`],
    });

    if (granted) {
      return fetch(`${this.configuration.baseUrl}/api/bookmarks/?limit=1`, {
        headers: {
          Authorization: `Token ${this.configuration.token}`,
        },
      })
        .then((response) => {
          return response.status === 200
            ? response.json()
            : Promise.reject(response);
        })
        .then((body) => {
          return !!body.results;
        })
        .catch(() => false);
    } else {
      return false;
    }
  }

  async findBookmarkByUrl(url: string) {
    return this.search(url, { limit: 1 }).then((results) =>
      results && results.length > 0 ? results[0] : undefined
    );
  }
}
