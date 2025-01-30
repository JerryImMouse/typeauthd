import { eabort, mapErr } from "../helpers";
import { Logger } from "../logging";
import { IDatabase } from "../types/database";
import {Client as PgClient} from 'pg';

export class PostgresDatabase implements IDatabase {
    private static _instance?: PostgresDatabase;
    private static readonly _authRecordsTableName = 'authorized_records';

    private readonly _connection!: PgClient;
    private readonly _logger: Logger

    private static readonly _authRecordsTableQuery = `CREATE TABLE IF NOT EXISTS ${PostgresDatabase._authRecordsTableName} 
    (
        id SERIAL PRIMARY KEY,
        uid TEXT NOT NULL UNIQUE,
        discord_uid TEXT NOT NULL UNIQUE,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`

    private static readonly _updateAtFunctionQuery = `
        CREATE OR REPLACE FUNCTION update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            IF NEW.access_token IS DISTINCT FROM OLD.access_token OR
            NEW.refresh_token IS DISTINCT FROM OLD.refresh_token THEN
                NEW.updated_at := CURRENT_TIMESTAMP;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `;

    private static readonly _updateAtTriggerQuery = `
        CREATE TRIGGER auth_records_updated_at_trigger
        BEFORE UPDATE ON ${PostgresDatabase._authRecordsTableName}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    `;

    private static readonly _recordsExtraTableName = 'records_extra';
    private static readonly _recordsExtraTableQuery = `CREATE TABLE IF NOT EXISTS ${PostgresDatabase._recordsExtraTableName} 
    (
        id SERIAL PRIMARY KEY,
        record_id INTEGER NOT NULL UNIQUE REFERENCES ${PostgresDatabase._authRecordsTableName}(id) ON DELETE CASCADE,
        json TEXT NOT NULL
    );`;

    private static readonly _authRecordsUidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_uid ON ${PostgresDatabase._authRecordsTableName} (uid);`
    private static readonly _authRecordsDuidIndexQuery = `CREATE INDEX IF NOT EXISTS idx_duid ON ${PostgresDatabase._authRecordsTableName} (discord_uid);`

    public constructor(con: string) {
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

    public async init(): Promise<boolean> {
        try {
            await this._connection.query(PostgresDatabase._authRecordsTableQuery);
            await this._connection.query(PostgresDatabase._updateAtFunctionQuery);
            if (!await this.select<any | null>('pg_trigger', 'tgname', 'auth_records_updated_at_trigger')) {
                await this._connection.query(PostgresDatabase._updateAtTriggerQuery);
            }

            await this._connection.query(PostgresDatabase._authRecordsUidIndexQuery);
            await this._connection.query(PostgresDatabase._authRecordsDuidIndexQuery);

            await this._connection.query(PostgresDatabase._recordsExtraTableQuery);
            return true;
        } catch (err) {
            if (err instanceof Error) {
                this._logger.error("Error occured during Postgres init method.", mapErr(err));
            }
            return false;
        }
    }

    public async execute(sql: string, params: (string | number)[] = []): Promise<boolean> {
        try {
            await this._connection.query(sql, params);
            return true;
        } catch (err) {
            this._handleError(sql, err);
            return false;
        }
    }

    public async upsert(table: string, data: Record<string, string | number>): Promise<number | null> {
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

    public select<T>(table: string, key: string, value: string | number): Promise<T | null> {
        return this.selectOrOnly(table, {[key]: value});
    }

    public async selectOrOnly<T>(table: string, data: Record<string, string | number>): Promise<T | null> {
        const columns = Object.keys(data);
        const values = Object.values(data);

        const conditions = columns.map((column, idx) => `${column} = $${idx + 1}`).join(" OR ");
        const query = `SELECT * FROM ${table} WHERE ${conditions}`;

        try {
            const result = await this._connection.query(query, values);

            if (result.rows.length > 0) {
                return result.rows[0] as T;
            }

            return null;
        } catch (err) {
            this._handleError(query, err);
            return null;
        }
    }

    public async selectLimitOffsetLike<T>(
        table: string, 
        offset: number, 
        limit: number, 
        data: Record<string, string | number> | undefined = undefined
    ): Promise<T[] | null> {
        let query = `SELECT * FROM ${table}`;
        const values: any[] = [];
        let conditionIndex = 1;
    
        if (data) {
            const conditions = Object.entries(data).map(([key, value]) => {
                if (typeof value === 'string') {
                    const condition = `${key} LIKE $${conditionIndex++}`;
                    values.push(`${value}%`);
                    return condition;
                } else if (typeof value === 'number') {
                    const condition = `${key} = $${conditionIndex++}`;
                    values.push(value);
                    return condition;
                }
                return '';
            }).filter(Boolean).join(' OR ');
            
            if (conditions) {
                query += ` WHERE ${conditions}`;
            }
        }
    
        query += ` ORDER BY id LIMIT $${conditionIndex++} OFFSET $${conditionIndex++}`;
        values.push(limit, offset);
    
        try {
            const result = await this._connection.query(query, values);
            if (result.rows.length > 0) {
                return result.rows as T[];
            }
            return null;
        } catch (err) {
            this._handleError(query, err);
            return null;
        }
    }

    public delete(table: string, key: string, value: string | number): Promise<boolean> {
        return this.deleteOr(table, {[key]: value});
    }

    public async deleteOr(table: string, data: Record<string, string | number>): Promise<boolean> {
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

    public close() {
        this._connection.end();
    }

    private _handleError(query: string, err: unknown): boolean {
        if (err && err instanceof Error) {
            this._logger.error(`Error during Postgres query. ${query}`, mapErr(err));
            return false;
        } 
        
        if (err) {
            this._logger.error(`Unknown error occured during Postgres query. ${query}`);
            return false;
        }

        return true;
    }
}