export interface Stream {
  url: string;
  http_referrer?: string | null;
  user_agent?: string | null;
  status?: string;
}

export interface Country {
  code: string;
  name: string;
}

export interface Channel {
  id: string;
  name: string;
  logo: string | null;
  country: Country | null;
  languages: string[];
  streams: Stream[];
  website?: string | null;
}

export interface FilterState {
  searchQuery: string;
  countryCode: string;
  language: string;
  sortBy: "name" | "country";
  favoritesOnly: boolean;
}

export interface ServerState {
  isLoaded: boolean;
  isLoading: boolean;
  lastFetched: string | null;
  error: string | null;
  count: number;
}
