import { eabort } from "../helpers";

export interface IDatabase {
    init(): Promise<boolean>;
    execute(sql: string, params: (string | number)[]): Promise<boolean>;
    select<T>(table: string, key: string, value: string | number): Promise<T | null>; 
    selectOrOnly<T>(table: string, data: Record<string, string | number>): Promise<T | null>
    upsert(table: string, data: Record<string, string | number>): Promise<number | null>;

    delete(table: string, key: string, value: string | number): Promise<boolean>;
    deleteOr(table: string, data: Record<string, string | number>): Promise<boolean>;
    close(): void;
}

/// AuthorizedRecord Structure
///
/// id INTEGER PRIMARY KEY AUTOINCREMENT
/// uid TEXT NOT NULL UNIQUE - Unique Identifier passed during authentication
/// discord_uid TEXT NOT NULL UNIQUE - Discord ID of the authorized user
/// access_token TEXT NOT NULL - Discord OAuth2 Bearer Token to retrieve data
/// refresh_token TEXT NOT NULL - Discord OAuth2 Bearer Token to refresh access_token
/// expires INTEGER NOT NULL - Discord access_token expire time in seconds

export interface IAuthorizedRecord {
    id?: number;
    uid: string;
    discord_uid: string;
    access_token: string;
    refresh_token: string;
    expires: number;
    updated_at: string;
}

export interface IAuthorizedRecordSearchOptions {
    id?: number,
    uid?: string,
    discord_uid?: string
}

export interface IRecordExtra {
    id?: number;
    record_id: number;
    json: string;
}

export interface IRecordExtraSearchOptions {
    id?: number,
    record_id?: number
}

export function validateRecordSearchOpt(opt: IAuthorizedRecordSearchOptions): keyof IAuthorizedRecordSearchOptions {
    const keys = ['id', 'uid', 'discord_uid'] as const; // Define valid keys
    const definedKeys = keys.filter(key => opt[key] !== undefined);

    if (definedKeys.length !== 1) {
        eabort('Failed to validate database search options.', opt);
    }

    return definedKeys[0];
}

export function validateRecordExtraSearchOpt(opt: IRecordExtraSearchOptions): void {
    if ((!opt.id && !opt.record_id) || (opt.id && opt.record_id)) {
        eabort('Failed to validate database search options.', opt);
    }
}