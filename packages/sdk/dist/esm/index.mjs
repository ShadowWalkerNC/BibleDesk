// @bibledesk/sdk — Official TypeScript/JavaScript Client Library
// Isomorphic client for Web, Node.js, and external AI agents (Claude Code, Cursor, Windsurf)
export class BibleDeskClient {
    constructor(config = {}) {
        // ── Scripture & Reader API ──
        this.bible = {
            getChapter: async ({ book, chapter, translation = 'web' }) => {
                const params = new URLSearchParams({
                    book,
                    chapter: String(chapter),
                    translation,
                });
                return this.request(`/api/bible/chapter?${params.toString()}`);
            },
            search: async ({ query, translation = 'web', limit = 20 }) => {
                const params = new URLSearchParams({
                    query,
                    translation,
                    limit: String(limit),
                });
                return this.request(`/api/bible/search?${params.toString()}`);
            },
            getLexicon: async ({ strongs }) => {
                const params = new URLSearchParams({ strongs });
                return this.request(`/api/bible/lexicon?${params.toString()}`);
            },
        };
        // ── Biblical Knowledge Graph API ──
        this.graph = {
            query: async ({ nodeKey }) => {
                const params = new URLSearchParams({ nodeKey });
                return this.request(`/api/graph?${params.toString()}`);
            },
        };
        // ── Prayer & Intercession API ──
        this.prayer = {
            list: async () => {
                return this.request('/api/prayer');
            },
            submit: async (req) => {
                return this.request('/api/prayer', {
                    method: 'POST',
                    body: JSON.stringify(req),
                });
            },
            escalate: async (req) => {
                return this.request('/api/prayer/escalate', {
                    method: 'POST',
                    body: JSON.stringify(req),
                });
            },
        };
        // ── Church Hub API ──
        this.church = {
            list: async (code) => {
                const query = code ? `?code=${code}` : '';
                return this.request(`/api/church${query}`);
            },
            register: async (churchData) => {
                return this.request('/api/church', {
                    method: 'POST',
                    body: JSON.stringify(churchData),
                });
            },
        };
        // ── SaaS & Export API ──
        this.export = {
            getObsidianVault: async (authToken) => {
                const headers = {
                    Accept: 'application/zip',
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                };
                const res = await fetch(`${this.baseUrl}/api/export/obsidian`, { headers });
                if (!res.ok) {
                    throw new Error(`BibleDesk Export Error ${res.status}`);
                }
                return res.arrayBuffer();
            },
        };
        // ── Model Context Protocol (MCP) Integration Helper ──
        this.mcp = {
            getSetupConfig: (client = 'claude') => {
                if (client === 'cursor') {
                    return {
                        mcpServers: {
                            bibledesk: {
                                url: `${this.baseUrl || 'https://bible-desk.vercel.app'}/api/mcp`,
                            },
                        },
                    };
                }
                return {
                    mcpServers: {
                        bibledesk: {
                            command: 'npx',
                            args: ['-y', '@bibledesk/mcp-server'],
                            env: {
                                BIBLEDESK_URL: this.baseUrl || 'https://bible-desk.vercel.app',
                            },
                        },
                    },
                };
            },
        };
        this.baseUrl = config.baseUrl || (typeof window !== 'undefined' ? '' : 'https://bible-desk.vercel.app');
        this.apiKey = config.apiKey;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(this.apiKey ? { 'x-gemini-api-key': this.apiKey } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`BibleDesk API Error ${res.status}: ${errorText}`);
        }
        return res.json();
    }
}
export function createBibleDeskClient(config) {
    return new BibleDeskClient(config);
}
