import { Configration } from "../config";
import { Logger } from "../logging";
import { PostgresDatabase } from "./postgres";
import { SqliteDatabase } from "./sqlite";
import { IAuthorizedRecord, IAuthorizedRecordSearchOptions, IDatabase, validateSearchOpt } from "./types";
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

    private constructor(db: T, uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number) {
        this._db = db;
        this.id = id;
        this.uid = uid;
        this.discord_uid = discord_uid;
        this.access_token = access_token;
        this.refresh_token = refresh_token;
        this.expires = expires;
    }

    async save(): Promise<boolean> {
        // shitty upsert implementation
        return await this._db.upsert(AuthorizedRecord._tableName, this.id ? {
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
    }

    static async find<T extends IDatabase>(db: T,options: IAuthorizedRecordSearchOptions): Promise<IAuthorizedRecord | null> {
        validateSearchOpt(options);

        // See TODO in delete() func
        let res = await db.select<IAuthorizedRecord>(
            AuthorizedRecord._tableName, // table
            options.id ? 'id' : 'uid', // key
            options.id ? options.id : options.uid! // value
        );

        if (!res) {
            return null;
        }

        return new AuthorizedRecord(db, res.uid, res.discord_uid, res.access_token, res.refresh_token, res.expires, res.id);
    }

    static async create<T extends IDatabase>(db: T, uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number): Promise<IAuthorizedRecord> {
        const recordExists = await db.selectOrOnly<IAuthorizedRecord>(AuthorizedRecord._tableName, {
            'discord_uid': discord_uid,
            'uid': uid 
        });

        if (recordExists) {
            Logger.get().error("Attempted to create an object with the same values, try to use find() instead", {uid, discord_uid, passed_uid: uid, passed_duid: discord_uid});
            return recordExists;
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
}