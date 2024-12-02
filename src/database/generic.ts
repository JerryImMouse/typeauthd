import { Configration } from "../config";
import { eabort } from "../helpers";
import { Logger } from "../logging";
import { PostgresDatabase } from "./postgres";
import { SqliteDatabase } from "./sqlite";
import { 
    IAuthorizedRecord, 
    IAuthorizedRecordSearchOptions, 
    IDatabase, 
    IRecordExtra, 
    IRecordExtraSearchOptions
} from "../types/database";

import { getValidRecordSearchOpt, getValidRecordExtraSearchOpt } from "./helpers";

import path from 'path';
const DEFAULT_SQLITE_PATH = path.resolve(__dirname, '..', '..', 'app.sqlite');


export class Database {
    private static _dbImpl?: IDatabase;

    public static getDbImpl() {
        if (this._dbImpl) {
            return this._dbImpl;
        }
    
        let config = Configration.get();
    
        switch (config.databaseProvider) {
            case "postgres": {
                this._dbImpl = new PostgresDatabase(config.databaseConnectionStr);
                break;
            }
            case "sqlite": {
                this._dbImpl = new SqliteDatabase(config.databaseConnectionStr);
                break;
            }
            default: {
                // fallback to sqlite with warning
                Logger.get().warn("Invalid database provider in configuration, falling back to SQLite...");
                this._dbImpl = new SqliteDatabase(DEFAULT_SQLITE_PATH);
            }
        }
    
        return this._dbImpl;
    }
}

export class AuthorizedRecord implements IAuthorizedRecord {
    private static readonly _tableName = 'authorized_records';

    private readonly _db: IDatabase;
    
    public id?: number; // id field can be null while created AuthorizedRecord are still not saved to database, but remain in memory.
    public uid: string;
    public discord_uid: string;
    public access_token: string;
    public refresh_token: string;
    public expires: number;
    public updated_at: string;

    public extra?: RecordExtra;

    private constructor(db: IDatabase, uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, updated_at: string, id?: number, extra?: RecordExtra) {
        this._db = db;
        this.id = id;
        this.uid = uid;
        this.discord_uid = discord_uid;
        this.access_token = access_token;
        this.refresh_token = refresh_token;
        this.expires = expires;
        this.updated_at = updated_at;
        this.extra = extra;
    }

    public async save(saveExtra: boolean = true): Promise<boolean> {
        const data = {
            uid: this.uid,
            discord_uid: this.discord_uid,
            access_token: this.access_token,
            refresh_token: this.refresh_token,
            expires: this.expires,
            ...(this.id && {id: this.id})
        }
        
        const insertedId = await this._db.upsert(AuthorizedRecord._tableName, data);

        if (insertedId) {
            this.id = insertedId;
        }

        if (this.extra && saveExtra) {
            await this.extra.save();
        }

        return true;
    }

    public async ensureExtra(json?: string) {
        if (!this.id) {
            eabort('Unable to initialize extras if save() was never called.', {uid: this.uid, duid: this.discord_uid});
            return false;
        }
        
        this.extra = await AuthorizedRecord._createExtraIfNeeded(this._db, this.id, json ? json : JSON.stringify({})) ?? undefined;
        
        if (this.extra) {
            await this.extra.save();
        }

        return true;
    }

    public static async find(db: IDatabase, options: IAuthorizedRecordSearchOptions, lookExtra: boolean = false): Promise<AuthorizedRecord | null> {
        const key = getValidRecordSearchOpt(options);
        const value = options[key]!;

        let res = await db.select<IAuthorizedRecord>(
            AuthorizedRecord._tableName, // table
            key, value
        );

        if (!res) {
            return null;
        }
        let extra: RecordExtra | undefined = undefined;
        
        if (lookExtra) {
            extra = await this._createExtraIfNeeded(db, res.id!, JSON.stringify({})) ?? undefined; // res.id should not be null...
        }

        return new AuthorizedRecord(db, res.uid, res.discord_uid, res.access_token, res.refresh_token, res.expires,res.updated_at, res.id, extra);
    }

    public static async create(db: IDatabase, uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number): Promise<AuthorizedRecord> {
        const recordExists = await db.selectOrOnly<IAuthorizedRecord>(AuthorizedRecord._tableName, {
            'discord_uid': discord_uid,
            'uid': uid 
        });

        if (recordExists) {
            Logger.get().error("Attempted to create an object with the same values, try to use find() instead", {
                found_uid: recordExists.uid, 
                found_duid: recordExists.discord_uid, 
                got_uid: uid, 
                got_duid: discord_uid
            });

            const extra = await RecordExtra.find(db, {record_id: recordExists.id});
            return new AuthorizedRecord(
                db, 
                recordExists.uid, 
                recordExists.discord_uid, 
                recordExists.access_token, 
                recordExists.refresh_token, 
                recordExists.expires,
                recordExists.updated_at,
                recordExists.id,
                extra ?? undefined
            );
        }

        return new AuthorizedRecord(db, uid, discord_uid, access_token, refresh_token, expires, new Date().toISOString(), id);
    }

    public async delete(): Promise<boolean> {
        // TODO:
        // I don't like the way I determine value and key, so I should to get a more elegant solution for this.
        // Im thinking about returning them out of some helper function which interface has to have, but Ill think about it more later.
        const searchValue = this.id ? this.id : this.uid;
        const key = this.id ? 'id' : 'uid';
        return this._db.delete(AuthorizedRecord._tableName, key, searchValue);
    }

    private static async _createExtraIfNeeded<T extends IDatabase>(db: T, record_id: number, json: string): Promise<RecordExtra | null> {
        const exists = await RecordExtra.find(db, {record_id: record_id});

        if (exists) {
            return exists;
        }

        if (Configration.get().extraEnabled) {
            return await RecordExtra.create<T>(db, record_id, json);
        }

        return null;
    }
}

/// More one possibly bad decision is an implementation of this. I'm not so experienced in building such "ORM", 
/// so it will be one more experiment, in which i'll determine if this was a good decision ;D
export class RecordExtra implements IRecordExtra {
    private readonly _db: IDatabase;
    private static readonly _tableName = 'records_extra'

    id?: number;
    record_id: number;
    json: string;

    private constructor(db: IDatabase, record_id: number, json: string, id?: number) {
        this._db = db;
        this.id = id;
        this.record_id = record_id;
        this.json = json;
    }

    public async save(): Promise<boolean> {
        const recordData = {
            record_id: this.record_id,
            json: this.json,
            ...(this.id && { id: this.id }),
        };
    
        const insertedId = await this._db.upsert(RecordExtra._tableName, recordData);

        if (insertedId) {
            this.id = insertedId;
        }

        return true;
    }

    public static async find<T extends IDatabase>(db: T, opt: IRecordExtraSearchOptions): Promise<RecordExtra | null> {
        const key = getValidRecordExtraSearchOpt(opt);
        const value = opt[key]!;

        let res = await db.select<IRecordExtra>(
            RecordExtra._tableName,
            key,
            value
        );

        if (!res) {
            return null;
        }

        return new RecordExtra(db, res.record_id, res.json, res.id);
    }

    public static async create<T extends IDatabase>(db: T, record_id: number, json: string): Promise<RecordExtra> {
        const recordExists = await db.select<IRecordExtra>(RecordExtra._tableName, 'record_id', record_id);

        if (recordExists) {
            Logger.get().error("Attempted to create an object with the same values, try to use find() instead", {
                found_record_id: recordExists.record_id,
                got_record_id: record_id
            });

            return new RecordExtra(db, recordExists.record_id, recordExists.json, recordExists.id);
        }

        return new RecordExtra(db, record_id, json);
    }

    public async delete(): Promise<boolean> {
        const searchValue = this.id ? this.id : this.record_id;
        const key = this.id ? 'id' : 'record_uid';
        return this._db.delete(RecordExtra._tableName, key, searchValue);
    }
}