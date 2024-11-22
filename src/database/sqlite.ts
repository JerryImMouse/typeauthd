import path from "path";
import { IAuthorizedRecord, IAuthorizedRecordSearchOptions, IDatabase, validateSearchOpt } from "./types";
import { Database as SqlDb } from "sqlite3";
import { eabort, mapErr } from "../helpers";
import { Logger } from "../logging";
import { Configration } from "../config";

export class SqliteDatabase implements IDatabase {
    private _logger: Logger
    private _connection: SqlDb;
    private static _instance?: SqliteDatabase;

    public static authRecordsTableName = 'authorized_records'
    private static _authRecordsTableQuery = `CREATE TABLE IF NOT EXISTS ${SqliteDatabase.authRecordsTableName} 
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL UNIQUE,
        discord_uid TEXT NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires INTEGER NOT NULL
    );`

    private static _authRecordsUidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_uid ON ${SqliteDatabase.authRecordsTableName} (uid);`
    private static _authRecordsDuidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_duid ON ${SqliteDatabase.authRecordsTableName} (discord_uid);`

    constructor(con: string) {
        this._logger = Logger.get();
        this._connection = new SqlDb(con, (err) => {
            if (err) {
                if (err instanceof Error) {
                    eabort('Error opening SQLite database.', mapErr(err));
                }
    
                eabort('Unknown error occured during SQLite database setup.');
            }
        });
    }

    async init(): Promise<boolean> {
        const tableResult = await this.execute(SqliteDatabase._authRecordsTableQuery);
        const idxUidResult = await this.execute(SqliteDatabase._authRecordsUidIndexQuery);
        const idxDuidResult = await this.execute(SqliteDatabase._authRecordsDuidIndexQuery);
            
        if (tableResult && idxUidResult && idxDuidResult) {
            return true;
        }

        return false;
    }

    public static get() {
        // assumed that provider is SQLite
        const con = Configration.get().database_connection();

        if (!SqliteDatabase._instance) {
            SqliteDatabase._instance = new SqliteDatabase(con);
        }

        return SqliteDatabase._instance!;
    }

    execute(sql: string, params: (string | number)[] = []): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this._connection.run(sql, params, (err) => {
                if (this._handleError(sql, err)) {
                    resolve(true);
                    return;
                }

                reject(false);
            })
        })
    }

    selectOne<T>(sql: string, params: (string | number)[] = []): Promise<T | null> {
        return new Promise((resolve, reject) => {
            this._connection.get(sql, params, (err, row) => {
                if (err && this._handleError(sql, err)) {
                    process.exit(1);
                }

                resolve(row ? (row as T) : null);
            })
        })
    }

    private _handleError(query: string, err: unknown): boolean {
        if (err && err instanceof Error) {
            this._logger.error(`Error during SQLite query. ${query}`, mapErr(err));
            return false;
        } else if (err) {
            this._logger.error(`Unknown error occured during SQLite query. ${query}`);
            return false;
        }

        return true;
    }
}

export class SqliteAuthorizedRecord implements IAuthorizedRecord {
    private _db: SqliteDatabase;
    
    id?: number | undefined;
    uid: string;
    discord_uid: string;
    access_token: string;
    refresh_token: string;
    expires: number;

    private constructor(uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number) {
        this._db = SqliteDatabase.get();
        this.id = id;
        this.uid = uid;
        this.discord_uid = discord_uid;
        this.access_token = access_token;
        this.refresh_token = refresh_token;
        this.expires = expires;
    }

    async save(): Promise<boolean> {
        // shitty upsert implementation
        return await this._db.execute(
            `INSERT INTO ${SqliteDatabase.authRecordsTableName} 
            (uid, discord_uid, access_token, refresh_token, expires) 
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(uid) DO UPDATE SET
                discord_uid = excluded.discord_uid,
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                expires = excluded.expires`,
            [this.uid, this.discord_uid, this.access_token, this.refresh_token, this.expires]
        );
    }

    static async find(options: IAuthorizedRecordSearchOptions): Promise<IAuthorizedRecord | null> {
        validateSearchOpt(options);
        return await SqliteDatabase.get().selectOne(`SELECT * FROM ${SqliteDatabase.authRecordsTableName} WHERE ${options.id ? 'id' : 'uid'} = ${options.id ? options.id : options.uid};`)
    }

    static async create(uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number): Promise<IAuthorizedRecord> {
        const recordExists = await SqliteDatabase.get().selectOne<SqliteAuthorizedRecord>(
            `SELECT * FROM ${SqliteDatabase.authRecordsTableName} WHERE uid = ? OR discord_uid = ?`,
            [uid, discord_uid]
        );

        if (recordExists) {
            Logger.get().error("Attempted to create an object with the same values, try to use find() instead", {uid, discord_uid, passed_uid: uid, passed_duid: discord_uid});
            return recordExists;
        }

        return new SqliteAuthorizedRecord(uid, discord_uid, access_token, refresh_token, expires, id);
    }

    async delete(): Promise<boolean> {
        const searchValue = this.id ? this.id : this.uid;
        const query = `DELETE FROM ${SqliteDatabase.authRecordsTableName} WHERE ${(this.id ? "id" : "uid")} = ?`;
        return this._db.execute(query, [searchValue]);
    }
}