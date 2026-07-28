/**
 * Dynamic Embed URL Builder
 * Constructs third-party video embed/iframe URLs on-the-fly
 * using TMDB IDs for both movies and TV episodes.
 */

export interface EmbedServer {
  name: string;
  key: string;
  url: string;
}

export interface EmbedOptions {
  tmdbId: number | string;
  type: 'movie' | 'tv';
  season?: number;
  episode?: number;
}

interface ProviderConfig {
  name: string;
  key: string;
  buildUrl: (opts: EmbedOptions) => string;
}

// ─── Provider Configurations ─────────────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
  {
    name: 'VidLink (Primary)',
    key: 'vidlink',
    buildUrl: ({ tmdbId, type, season, episode }) => {
      const options = '?primaryColor=6366f1&autoplay=false';
      if (type === 'tv' && season !== undefined && episode !== undefined) {
        return `https://vidlink.pro/tv/${tmdbId}/${season}/${episode}${options}`;
      }
      return `https://vidlink.pro/movie/${tmdbId}${options}`;
    },
  },
  {
    name: 'VidSrc PRO',
    key: 'vidsrcpro',
    buildUrl: ({ tmdbId, type, season, episode }) => {
      if (type === 'tv' && season !== undefined && episode !== undefined) {
        return `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidsrc.pro/embed/movie/${tmdbId}`;
    },
  },
  {
    name: 'VidSrc CC',
    key: 'vidsrccc',
    buildUrl: ({ tmdbId, type, season, episode }) => {
      if (type === 'tv' && season !== undefined && episode !== undefined) {
        return `https://vidsrc.cc/v2/embed/tv/${tmdbId}/${season}/${episode}`;
      }
      return `https://vidsrc.cc/v2/embed/movie/${tmdbId}`;
    },
  },
  {
    name: 'MultiEmbed',
    key: 'multiembed',
    buildUrl: ({ tmdbId, type, season, episode }) => {
      const base = `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
      if (type === 'tv' && season !== undefined && episode !== undefined) {
        return `${base}&s=${season}&e=${episode}`;
      }
      return base;
    },
  },
  {
    name: 'VidSrc ME',
    key: 'vidsrcme',
    buildUrl: ({ tmdbId, type, season, episode }) => {
      if (type === 'tv' && season !== undefined && episode !== undefined) {
        return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${episode}`;
      }
      return `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
    },
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build embed URLs for all available providers.
 * Returns an array of server objects with name, key, and constructed URL.
 */
export function buildEmbedServers(options: EmbedOptions): EmbedServer[] {
  return PROVIDERS.map((provider) => ({
    name: provider.name,
    key: provider.key,
    url: provider.buildUrl(options),
  }));
}

/**
 * Build embed URL for a specific provider by key.
 */
export function buildEmbedUrl(
  providerKey: string,
  options: EmbedOptions
): string | null {
  const provider = PROVIDERS.find((p) => p.key === providerKey);
  if (!provider) return null;
  return provider.buildUrl(options);
}

/**
 * Get list of all available provider names and keys.
 */
export function getAvailableProviders(): { name: string; key: string }[] {
  return PROVIDERS.map(({ name, key }) => ({ name, key }));
}

/**
 * Validate that required parameters are present for the media type.
 */
export function validateEmbedOptions(options: EmbedOptions): {
  valid: boolean;
  error?: string;
} {
  if (!options.tmdbId) {
    return { valid: false, error: 'TMDB ID is required' };
  }

  if (options.type === 'tv') {
    if (options.season === undefined || options.episode === undefined) {
      return {
        valid: false,
        error: 'Season and episode numbers are required for TV shows',
      };
    }
    if (options.season < 0 || options.episode < 1) {
      return {
        valid: false,
        error: 'Invalid season or episode number',
      };
    }
  }

  return { valid: true };
}
