import { eabort } from "../helpers";

export interface IDatabase {
    init(): Promise<boolean>;
    execute(sql: string, params?: any[]): Promise<boolean>;
    selectOne<T>(query: string, params?: any[]): Promise<T | null>;
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

    save(): Promise<boolean>;
    delete(): Promise<boolean>;
    // other CRUD operations can be done via save() and setting fields ;D
}

export interface IAuthorizedRecordSearchOptions {
    id?: number,
    uid?: string
}

export function validateSearchOpt(opt: IAuthorizedRecordSearchOptions): void {
    if ((!opt.id && !opt.uid) || (opt.id && opt.uid)) {
        eabort('Failed to validate database search options.', opt);
    }
}