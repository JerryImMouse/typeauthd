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
    IRecordExtraSearchOptions, 
    validateRecordExtraSearchOpt, 
    validateRecordSearchOpt 
} from "./types";

import path from 'path';

export class Database {
    private static _dbImpl?: IDatabase;
    private static readonly _defaultSqlitePath = path.resolve(__dirname, '..', '..', 'app.sqlite');

    static getDbImpl() {
        if (this._dbImpl) {
            return this._dbImpl;
        }
    
        let config = Configration.get();
    
        switch (config.database_provider()) {
            case "postgres": {
                this._dbImpl = new PostgresDatabase(config.database_connection());
                break;
            }
            case "sqlite": {
                this._dbImpl = new SqliteDatabase(config.database_connection());
                break;
            }
            default: {
                // fallback to sqlite with warning
                Logger.get().warn("Invalid database provider in configuration, falling back to SQLite...");
                this._dbImpl = new SqliteDatabase(this._defaultSqlitePath);
            }
        }
    
        return this._dbImpl;
    }
}

/// TODO: Im still thinking about realization of this. I want it to be easily used wherever I'll need. 
///
/// So, I have 3 ways of passing database object here. 
/// 1. Store it in a field and pass it wherever I want to create a new object of this type. Static methods will be served with this object always.
/// 2. Store it in a field and pass it implicitly by (somehow) using static methods in interfaces(idk how, really), static methods then can be served implicitly too.
/// 3. All methods(static or not) will accept database object.
///
/// In all this ways there are cons and pros. Now, I like the first way, it seems to be a good choice, but I have not much experience in such things
/// so I'll have to look at this while growing the project ;D
///
/// More one TODO: I need to get rid of SQL queries here, so I can fully implement multiple database providers, 
/// current implementation won't work because of different syntax in Postgres and SQLite
export class AuthorizedRecord<T extends IDatabase> implements IAuthorizedRecord {
    private readonly _db: T;
    private static readonly _tableName = 'authorized_records'
    
    id?: number | undefined;
    uid: string;
    discord_uid: string;
    access_token: string;
    refresh_token: string;
    expires: number;

    extra?: RecordExtra<T>;

    private constructor(db: T, uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number, extra?: RecordExtra<T>) {
        this._db = db;
        this.id = id;
        this.uid = uid;
        this.discord_uid = discord_uid;
        this.access_token = access_token;
        this.refresh_token = refresh_token;
        this.expires = expires;
        this.extra = extra;
    }

    async save(saveExtra: boolean = true): Promise<boolean> {
        // shitty upsert implementation
        const insertedId = await this._db.upsert(AuthorizedRecord._tableName, this.id ? {
            id: this.id,
            uid: this.uid,
            discord_uid: this.discord_uid,
            access_token: this.access_token,
            refresh_token: this.refresh_token,
            expires: this.expires,
        } : {
            uid: this.uid,
            discord_uid: this.discord_uid,
            access_token: this.access_token,
            refresh_token: this.refresh_token,
            expires: this.expires,
        });

        if (insertedId) {
            this.id = insertedId;
        }

        if (this.extra && saveExtra) {
            await this.extra.save();
        }

        return true;
    }

    async ensureExtra(json?: string) {
        if (!this.id) {
            eabort('Unable to initialize extras if save() was never called.', this);
            return false;
        }
        
        this.extra = await AuthorizedRecord._createExtraIfNeeded(this._db, this.id, json ? json : JSON.stringify({}));
        
        if (this.extra) {
            await this.extra.save();
        }

        return true;
    }

    static async find<T extends IDatabase>(db: T,options: IAuthorizedRecordSearchOptions): Promise<IAuthorizedRecord | null> {
        validateRecordSearchOpt(options);

        // See TODO in delete() func
        let res = await db.select<IAuthorizedRecord>(
            AuthorizedRecord._tableName, // table
            options.id ? 'id' : 'uid', // key
            options.id ? options.id : options.uid! // value
        );

        if (!res) {
            return null;
        }

        let extra = await this._createExtraIfNeeded(db, res.id!, JSON.stringify({})); // res.id should not be null...
        return new AuthorizedRecord(db, res.uid, res.discord_uid, res.access_token, res.refresh_token, res.expires, res.id, extra);
    }

    static async create<T extends IDatabase>(db: T, uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number): Promise<AuthorizedRecord<T>> {
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
            
            return new AuthorizedRecord(
                db, 
                recordExists.uid, 
                recordExists.discord_uid, 
                recordExists.access_token, 
                recordExists.refresh_token, 
                recordExists.expires, 
                recordExists.id
            );
        }

        return new AuthorizedRecord(db, uid, discord_uid, access_token, refresh_token, expires, id);
    }

    async delete(): Promise<boolean> {
        // TODO:
        // I don't like the way I determine value and key, so I should to get a more elegant solution for this.
        // Im thinking about returning them out of some helper function which interface has to have, but Ill think about it more later.
        const searchValue = this.id ? this.id : this.uid;
        const key = this.id ? 'id' : 'uid';
        return this._db.delete(AuthorizedRecord._tableName, key, searchValue);
    }

    private static async _createExtraIfNeeded<T extends IDatabase>(db: T, record_id: number, json: string): Promise<RecordExtra<T> | undefined> {
        // TODO: check exists

        if (Configration.get().app_extraEnabled()) {
            return await RecordExtra.create<T>(db, record_id, json);
        }
        return undefined;
    }
}

/// More one possibly bad decision is an implementation of this. I'm not so experienced in building such "ORM", 
/// so it will be one more experiment, in which i'll determine if this was a good decision ;D
export class RecordExtra<T extends IDatabase> implements IRecordExtra {
    private readonly _db: T;
    private static readonly _tableName = 'records_extra'

    id?: number;
    record_id: number;
    json: string;

    private constructor(db: T, record_id: number, json: string, id?: number) {
        this._db = db;
        this.id = id;
        this.record_id = record_id;
        this.json = json;
    }

    async save(): Promise<boolean> {
        const insertedId = await this._db.upsert(RecordExtra._tableName, this.id ? {
            id: this.id,
            record_id: this.record_id,
            json: this.json
        } : {
            record_id: this.record_id,
            json: this.json
        })

        if (insertedId) {
            this.id = insertedId;
        }

        return true;
    }

    static async find<T extends IDatabase>(db: T, opt: IRecordExtraSearchOptions): Promise<RecordExtra<T> | null> {
        validateRecordExtraSearchOpt(opt);

        let res = await db.select<IRecordExtra>(
            RecordExtra._tableName, // table
            opt.id ? 'id' : 'record_id', // key
            opt.id ? opt.id : opt.record_id! // value
        );

        if (!res) {
            return null;
        }

        return new RecordExtra(db, res.record_id, res.json, res.id);
    }

    static async create<T extends IDatabase>(db: T, record_id: number, json: string): Promise<RecordExtra<T>> {
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

    async delete(): Promise<boolean> {
        const searchValue = this.id ? this.id : this.record_id;
        const key = this.id ? 'id' : 'record_uid';
        return this._db.delete(RecordExtra._tableName, key, searchValue);
    }
}