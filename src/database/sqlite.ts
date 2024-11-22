import { IDatabase } from "./types";
import { Database as SqlDb } from "sqlite3";
import { eabort, mapErr } from "../helpers";
import { Logger } from "../logging";
import { Configration } from "../config";

export class SqliteDatabase implements IDatabase {
    private readonly _logger: Logger
    private readonly _connection: SqlDb;
    private static _instance?: SqliteDatabase;

    public static readonly authRecordsTableName = 'authorized_records'
    private static readonly _authRecordsTableQuery = `CREATE TABLE IF NOT EXISTS ${SqliteDatabase.authRecordsTableName} 
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL UNIQUE,
        discord_uid TEXT NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires INTEGER NOT NULL
    );`

    private static readonly _authRecordsUidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_uid ON ${SqliteDatabase.authRecordsTableName} (uid);`
    private static readonly _authRecordsDuidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_duid ON ${SqliteDatabase.authRecordsTableName} (discord_uid);`

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