"use strict";
// @bibledesk/sdk — Official TypeScript/JavaScript Client Library
// Isomorphic client for Web, Node.js, and external AI agents (Claude Code, Cursor, Windsurf)
Object.defineProperty(exports, "__esModule", { value: true });
exports.BibleDeskClient = void 0;
exports.createBibleDeskClient = createBibleDeskClient;
class BibleDeskClient {
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
        // ── 5-Dimension Grounded Study & Research API ──
        this.study = {
            getCrossReferences: async ({ book, chapter, verse }) => {
                const params = new URLSearchParams({
                    book,
                    chapter: String(chapter),
                    verse: String(verse),
                });
                return this.request(`/api/cross-references?${params.toString()}`);
            },
            getCommentary: async ({ verseRef }) => {
                const params = new URLSearchParams({ verseRef });
                return this.request(`/api/commentary?${params.toString()}`);
            },
            research: async (req) => {
                return this.request('/api/research', {
                    method: 'POST',
                    body: JSON.stringify(req),
                });
            },
        };
        // ── Personal Study Notes & Annotations API ──
        this.notes = {
            list: async (verseRef) => {
                const query = verseRef ? `?verseRef=${encodeURIComponent(verseRef)}` : '';
                return this.request(`/api/notes${query}`);
            },
            create: async (note) => {
                return this.request('/api/notes', {
                    method: 'POST',
                    body: JSON.stringify(note),
                });
            },
            delete: async (noteId) => {
                return this.request(`/api/notes?id=${encodeURIComponent(noteId)}`, {
                    method: 'DELETE',
                });
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
        this.mcp = {
            getSetupConfig: (client = 'claude') => {
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
        this.baseUrl = config.baseUrl || (typeof window !== 'undefined' ? '' : 'https://bibledesk.up.railway.app');
        this.apiKey = config.apiKey;
        this.authToken = config.authToken;
    }
    setAuthToken(token) {
        this.authToken = token;
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(this.apiKey ? { 'x-gemini-api-key': this.apiKey } : {}),
            ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
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
exports.BibleDeskClient = BibleDeskClient;
function createBibleDeskClient(config) {
    return new BibleDeskClient(config);
}
