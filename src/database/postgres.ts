import { eabort, mapErr } from "../helpers";
import { Logger } from "../logging";
import { IDatabase } from "./types";
import {Client as PgClient} from 'pg';

export class PostgresDatabase implements IDatabase {
    private readonly _logger: Logger
    private readonly _connection!: PgClient;
    private static _instance?: PostgresDatabase;
    private static readonly _authRecordsTableName = 'authorized_records';

    private static readonly _authRecordsTableQuery = `CREATE TABLE IF NOT EXISTS ${PostgresDatabase._authRecordsTableName} 
    (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        discord_uid TEXT NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires BIGINT NOT NULL
    );`

    private static readonly _recordsExtraTableName = 'records_extra';
    private static readonly _recordsExtraTableQuery = `CREATE TABLE IF NOT EXISTS ${PostgresDatabase._recordsExtraTableName} 
    (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES ${PostgresDatabase._authRecordsTableName}(id) ON DELETE CASCADE,
        json TEXT NOT NULL
    );`;

    private static readonly _authRecordsUidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_uid ON ${PostgresDatabase._authRecordsTableName} (uid);`
    private static readonly _authRecordsDuidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_duid ON ${PostgresDatabase._authRecordsTableName} (discord_uid);`

    constructor(con: string) {
        this._logger = Logger.get();
        try {
            this._connection = new PgClient({connectionString: con});
            this._connection.connect();
        } catch (err) {
            if (err instanceof Error) {
                eabort('Error during setting up postgres connection.', mapErr(err));
            } else {
                eabort('Unknown error during postgres setup.');
            }
        }
    }

    async init(): Promise<boolean> {
        try {
            await this._connection.query(PostgresDatabase._authRecordsTableQuery);
            // TODO: add indexes

            await this._connection.query(PostgresDatabase._recordsExtraTableQuery);
            return true;
        } catch (err) {
            if (err instanceof Error) {
                this._logger.warn("Error occured during Postgres init method.", mapErr(err));
            }
            return false;
        }
    }

    async execute(sql: string, params: (string | number)[] = []): Promise<boolean> {
        try {
            await this._connection.query(sql, params);
            return true;
        } catch (err) {
            this._handleError(sql, err);
            return false;
        }
    }

    async upsert(table: string, data: Record<string, string | number>): Promise<number | null> {
        const columns = Object.keys(data);
        const values = Object.values(data);

        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

        const query = `
            INSERT INTO ${table} (${columns.join(", ")})
            VALUES (${placeholders})
            ON CONFLICT (${columns[0]}) DO UPDATE SET
            ${columns.slice(1).map(col => `${col} = EXCLUDED.${col}`).join(", ")}
            RETURNING id;
        `;

        try {
            const result = await this._connection.query(query, values);
            return result.rows.length > 0 ? result.rows[0].id : null;
        } catch (err) {
            this._handleError(query, err);
            return null;
        }
    }

    select<T>(table: string, key: string, value: string | number): Promise<T | null> {
        return this.selectOrOnly(table, {[key]: value});
    }

    async selectOrOnly<T>(table: string, data: Record<string, string | number>): Promise<T | null> {
        const columns = Object.keys(data);
        const values = Object.values(data);

        const conditions = columns.map((column, idx) => `${column} = $${idx + 1}`).join(" OR ");
        const query = `SELECT * FROM ${table} WHERE ${conditions}`;

        try {
            const result = await this._connection.query(query, values);

            if (result.rows.length > 0) {
                return result.rows[0] as T;
            } else {
                return null;
            }
        } catch (err) {
            this._handleError(query, err);
            return null;
        }
    }

    delete(table: string, key: string, value: string | number): Promise<boolean> {
        return this.deleteOr(table, {[key]: value});
    }

    async deleteOr(table: string, data: Record<string, string | number>): Promise<boolean> {
        const columns = Object.keys(data);
        const values = Object.values(data);

        const conditions = columns.map((column, idx) => `${column} = $${idx + 1}`).join(" OR ");
        const query = `DELETE FROM ${table} WHERE ${conditions}`;

        try {
            await this._connection.query(query, values);
            return true;
        } catch (err) {
            this._handleError(query, err);
            return false;
        }
    }

    private _handleError(query: string, err: unknown): boolean {
        if (err && err instanceof Error) {
            this._logger.error(`Error during Postgres query. ${query}`, mapErr(err));
            return false;
        } else if (err) {
            this._logger.error(`Unknown error occured during Postgres query. ${query}`);
            return false;
        }

        return true;
    }
}