import { IDatabase } from "./types";
import { Database as SqlDb } from "sqlite3";
import { eabort, mapErr } from "../helpers";
import { Logger } from "../logging";
import { Configration } from "../config";

export class SqliteDatabase implements IDatabase {
    private readonly _logger: Logger
    private readonly _connection: SqlDb;
    private static _instance?: SqliteDatabase;
    private static readonly _authRecordsTableName = 'authorized_records';

    private static readonly _authRecordsTableQuery = `CREATE TABLE IF NOT EXISTS ${SqliteDatabase._authRecordsTableName} 
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL UNIQUE,
        discord_uid TEXT NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`

    private static readonly _authRecordsUpdateTrigger = `
        CREATE TRIGGER IF NOT EXISTS update_auth_records_updated_at
        AFTER UPDATE ON ${SqliteDatabase._authRecordsTableName}
        FOR EACH ROW
        WHEN OLD.access_token != NEW.access_token OR OLD.refresh_token != NEW.refresh_token
        BEGIN
            UPDATE ${SqliteDatabase._authRecordsTableName}
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = OLD.id;
        END;
        `;

    private static readonly _recordsExtraTableName = 'records_extra';
    private static readonly _recordsExtraTableQuery = `CREATE TABLE IF NOT EXISTS ${SqliteDatabase._recordsExtraTableName} 
    (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id INTEGER NOT NULL UNIQUE,
        json TEXT NOT NULL,
        FOREIGN KEY (record_id) REFERENCES ${SqliteDatabase._authRecordsTableName}(id) ON DELETE CASCADE
    );`;

    private static readonly _authRecordsUidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_uid ON ${SqliteDatabase._authRecordsTableName} (uid);`
    private static readonly _authRecordsDuidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_duid ON ${SqliteDatabase._authRecordsTableName} (discord_uid);`

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
        const authTableResult = await this.execute(SqliteDatabase._authRecordsTableQuery);
        const authTriggeResult = await this.execute(SqliteDatabase._authRecordsUpdateTrigger);
        const authIdxUidResult = await this.execute(SqliteDatabase._authRecordsUidIndexQuery);
        const authIdxDuidResult = await this.execute(SqliteDatabase._authRecordsDuidIndexQuery);

        const extraTableResult = await this.execute(SqliteDatabase._recordsExtraTableQuery);
            
        if (authTableResult && authIdxUidResult && authIdxDuidResult && extraTableResult) {
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

    upsert(table: string, data: Record<string, string | number>): Promise<number | null> {
        const columns = Object.keys(data);
        const values = Object.values(data);

        const placeholders = columns.map(() => "?").join(", ");

        const updateClause = columns
            .map(column => `${column} = excluded.${column}`)
            .join(", ");

        const query = `
            INSERT INTO ${table} (${columns.join(", ")})
            VALUES (${placeholders})
            ON CONFLICT(${columns[0]}) DO UPDATE SET
            ${updateClause};
        `;

        return new Promise((resolve, reject) => {
            this._connection.run(query, values, (err) => {
                if (!this._handleError(query, err)) {
                    return resolve(null);
                }

                this._connection.get(`SELECT last_insert_rowid() as id`, (err, row: {id: number}) => {
                    if (err) {
                        this._handleError(`SELECT last_insert_rowid()`, err);
                        return reject(null);
                    }
                    resolve(row ? row.id : null);
                });
            })
        })
    }

    select<T>(table: string, key: string, value: string | number): Promise<T | null> {
        return this.selectOrOnly(table, {[key]: value});
    }

    selectOrOnly<T>(table: string, data: Record<string, string | number>): Promise<T | null> {
        const columns = Object.keys(data);
        const values = Object.values(data);

        const conditions = columns.map(column => `${column} = ?`).join(" OR ");
        const query = `SELECT * FROM ${table} WHERE ${conditions}`;

        return new Promise((resolve, reject) => {
            this._connection.get(query, values, (err, row) => {
                if (!this._handleError(query, err)) {
                    reject(false);
                    return;
                }

                resolve(row ? row as T : null);
            })
        })
    }

    delete(table: string, key: string, value: string | number): Promise<boolean> {
        return this.deleteOr(table, {[key]: value});
    }

    deleteOr(table: string, data: Record<string, string | number>): Promise<boolean> {
        const columns = Object.keys(data);
        const values = Object.values(data);

        const conditions = columns.map(column => `${column} = ?`).join(" OR ");
        const query = `DELETE FROM ${table} WHERE ${conditions}`;

        return new Promise((resolve, reject) => {
            this._connection.run(query, values, (err) => {
                this._handleError(query, err) ? resolve(true) : reject(false);
            })
        })
    }

    close() {
        this._connection.close();
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