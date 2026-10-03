// @bibledesk/sdk — Official TypeScript/JavaScript Client Library
// Isomorphic client for Web, Node.js, and external AI agents (Claude Code, Cursor, Windsurf)

export interface BibleDeskClientConfig {
  baseUrl?: string;
  apiKey?: string; // Optional Gemini API key for AI assistant endpoints
}

export interface ChapterRequest {
  book: string;
  chapter: number;
  translation?: 'kjv' | 'asv' | 'web' | 'bbe' | 'darby' | 'ylt' | string;
}

export interface SearchRequest {
  query: string;
  translation?: string;
  limit?: number;
}

export interface LexiconRequest {
  strongs: string; // e.g. "G2889" or "H7225"
}

export interface PrayerSubmitRequest {
  title: string;
  request: string; // Server contract: POST /api/prayer expects `request` (not `text`)
  category?: string;
  privacy_mode?: 'approximate' | 'precise' | 'restricted';
  urgency?: 'low' | 'normal' | 'urgent' | 'crisis';
  country_code?: string;
}

export interface PrayerEscalateRequest {
  prayerId: string;
  targetLevel: 'private' | 'circle' | 'church' | 'atlas';
  urgencyLevel?: 'low' | 'normal' | 'urgent' | 'crisis';
  churchId?: string;
  isAnonymous?: boolean;
  updateNote?: string;
}

export interface CrossReferencesRequest {
  book: string;
  chapter: number;
  verse: number;
}

export interface CommentaryRequest {
  verseRef: string; // e.g. "John 1:1"
}

export interface ResearchRequest {
  query: string;
  perspective?: 'exegetical' | 'historical' | 'theological' | 'practical' | 'all';
}

export interface CreateNoteRequest {
  verseRef: string;
  noteText: string;
  tags?: string[];
  isPrivate?: boolean;
}

export interface BibleDeskClientConfig {
  baseUrl?: string;
  apiKey?: string; // Optional Gemini API key for AI assistant endpoints
  authToken?: string; // Stateless JWT token for authenticated operations
}

export class BibleDeskClient {
  private baseUrl: string;
  private apiKey?: string;
  private authToken?: string;

  constructor(config: BibleDeskClientConfig = {}) {
    this.baseUrl = config.baseUrl || (typeof window !== 'undefined' ? '' : 'https://bibledesk.up.railway.app');
    this.apiKey = config.apiKey;
    this.authToken = config.authToken;
  }

  public setAuthToken(token: string) {
    this.authToken = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(this.apiKey ? { 'x-gemini-api-key': this.apiKey } : {}),
      ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`BibleDesk API Error ${res.status}: ${errorText}`);
    }
    return res.json();
  }

  // ── Scripture & Reader API ──
  public readonly bible = {
    getChapter: async ({ book, chapter, translation = 'web' }: ChapterRequest) => {
      const params = new URLSearchParams({
        book,
        chapter: String(chapter),
        translation,
      });
      return this.request<any>(`/api/bible/chapter?${params.toString()}`);
    },

    search: async ({ query, translation = 'web', limit = 20 }: SearchRequest) => {
      const params = new URLSearchParams({
        query,
        translation,
        limit: String(limit),
      });
      return this.request<any>(`/api/bible/search?${params.toString()}`);
    },

    getLexicon: async ({ strongs }: LexiconRequest) => {
      const params = new URLSearchParams({ strongs });
      return this.request<any>(`/api/bible/lexicon?${params.toString()}`);
    },
  };

  // ── 5-Dimension Grounded Study & Research API ──
  public readonly study = {
    getCrossReferences: async ({ book, chapter, verse }: CrossReferencesRequest) => {
      const params = new URLSearchParams({
        book,
        chapter: String(chapter),
        verse: String(verse),
      });
      return this.request<any>(`/api/cross-references?${params.toString()}`);
    },

    getCommentary: async ({ verseRef }: CommentaryRequest) => {
      const params = new URLSearchParams({ verseRef });
      return this.request<any>(`/api/commentary?${params.toString()}`);
    },

    research: async (req: ResearchRequest) => {
      return this.request<any>('/api/research', {
        method: 'POST',
        body: JSON.stringify(req),
      });
    },
  };

  // ── Personal Study Notes & Annotations API ──
  public readonly notes = {
    list: async (verseRef?: string) => {
      const query = verseRef ? `?verseRef=${encodeURIComponent(verseRef)}` : '';
      return this.request<any>(`/api/notes${query}`);
    },

    create: async (note: CreateNoteRequest) => {
      return this.request<any>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(note),
      });
    },

    delete: async (noteId: string) => {
      return this.request<any>(`/api/notes?id=${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
      });
    },
  };

  // ── Biblical Knowledge Graph API ──
  public readonly graph = {
    query: async ({ nodeKey }: { nodeKey: string }) => {
      const params = new URLSearchParams({ nodeKey });
      return this.request<any>(`/api/graph?${params.toString()}`);
    },
  };

  // ── Prayer & Intercession API ──
  public readonly prayer = {
    list: async () => {
      return this.request<any>('/api/prayer');
    },

    submit: async (req: PrayerSubmitRequest) => {
      return this.request<any>('/api/prayer', {
        method: 'POST',
        body: JSON.stringify(req),
      });
    },

    escalate: async (req: PrayerEscalateRequest) => {
      return this.request<any>('/api/prayer/escalate', {
        method: 'POST',
        body: JSON.stringify(req),
      });
    },
  };

  // ── Church Hub API ──
  public readonly church = {
    list: async (code?: string) => {
      const query = code ? `?code=${code}` : '';
      return this.request<any>(`/api/church${query}`);
    },

    register: async (churchData: any) => {
      return this.request<any>('/api/church', {
        method: 'POST',
        body: JSON.stringify(churchData),
      });
    },
  };

  // ── SaaS & Export API ──
  public readonly export = {
    getObsidianVault: async (authToken?: string) => {
      const headers: Record<string, string> = {
        Accept: 'application/zip',
        ...(authToken || this.authToken ? { Authorization: `Bearer ${authToken || this.authToken}` } : {}),
      };
      const res = await fetch(`${this.baseUrl}/api/export/obsidian`, { headers });
      if (!res.ok) {
        throw new Error(`BibleDesk Export Error ${res.status}`);
      }
      return res.arrayBuffer();
    },
  };

  // ── Model Context Protocol (MCP) Integration Helper ──
  public readonly mcp = {
    getSetupConfig: (client: 'claude' | 'cursor' | 'windsurf' | 'muse' = 'claude') => {
      const targetUrl = this.baseUrl || 'https://bibledesk.up.railway.app';
      if (client === 'cursor') {
        return {
          mcpServers: {
            bibledesk: {
              url: `${targetUrl}/api/mcp`,
            },
          },
        };
      }
      if (client === 'muse') {
        return {
          tools: ['@bibledesk/mcp-server'],
          env: {
            BIBLEDESK_URL: targetUrl,
          },
        };
      }
      return {
        mcpServers: {
          bibledesk: {
            command: 'npx',
            args: ['-y', '@bibledesk/mcp-server'],
            env: {
              BIBLEDESK_URL: targetUrl,
            },
          },
        },
      };
    },
  };
}

export function createBibleDeskClient(config?: BibleDeskClientConfig): BibleDeskClient {
  return new BibleDeskClient(config);
}
