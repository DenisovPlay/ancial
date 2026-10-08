/** Ответ `/api/V2/search/Search.php` (веб/картинки через SearXNG + люди, сообщества и приложения Zypo). */

export interface SearchWebResult {
  engines: string[];
  host: string;
  published: string | null;
  snippet: string;
  title: string;
  url: string;
}

export interface SearchInfobox {
  content: string;
  img: string | null;
  links: Array<{ title: string; url: string }>;
  title: string;
}

export interface SearchImageResult {
  height: number;
  host: string;
  img: string;
  thumb: string;
  title: string;
  url: string;
  width: number;
}

export interface SearchUser {
  id: number;
  img: string | null;
  name: string;
  username: string;
  verify: boolean;
}

export interface SearchGroup {
  desk: string;
  id: number;
  img: string | null;
  name: string;
  slnk: string;
  verify: boolean;
}

export interface SearchApp {
  developer: string | null;
  id: number;
  img: string | null;
  name: string;
}

export interface SearchResponse {
  apps: SearchApp[];
  groups: SearchGroup[];
  has_more: boolean;
  images: { results: SearchImageResult[]; unavailable: boolean } | null;
  page: number;
  query: string;
  type: string;
  users: SearchUser[];
  web: { infobox: SearchInfobox | null; results: SearchWebResult[]; suggestions: string[]; unavailable: boolean } | null;
}

export type SearchRequestType = 'all' | 'apps' | 'groups' | 'images' | 'users' | 'web';
