export interface BibleDeskClientConfig {
    baseUrl?: string;
    apiKey?: string;
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
    strongs: string;
}
export interface PrayerSubmitRequest {
    title: string;
    request: string;
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
export declare class BibleDeskClient {
    private baseUrl;
    private apiKey?;
    constructor(config?: BibleDeskClientConfig);
    private request;
    readonly bible: {
        getChapter: ({ book, chapter, translation }: ChapterRequest) => Promise<any>;
        search: ({ query, translation, limit }: SearchRequest) => Promise<any>;
        getLexicon: ({ strongs }: LexiconRequest) => Promise<any>;
    };
    readonly graph: {
        query: ({ nodeKey }: {
            nodeKey: string;
        }) => Promise<any>;
    };
    readonly prayer: {
        list: () => Promise<any>;
        submit: (req: PrayerSubmitRequest) => Promise<any>;
        escalate: (req: PrayerEscalateRequest) => Promise<any>;
    };
    readonly church: {
        list: (code?: string) => Promise<any>;
        register: (churchData: any) => Promise<any>;
    };
    readonly mcp: {
        getSetupConfig: (client?: "claude" | "cursor" | "windsurf") => {
            mcpServers: {
                bibledesk: {
                    url: string;
                    command?: undefined;
                    args?: undefined;
                    env?: undefined;
                };
            };
        } | {
            mcpServers: {
                bibledesk: {
                    command: string;
                    args: string[];
                    env: {
                        BIBLEDESK_URL: string;
                    };
                    url?: undefined;
                };
            };
        };
    };
}
export declare function createBibleDeskClient(config?: BibleDeskClientConfig): BibleDeskClient;
