import {SqliteDatabase} from '../src/database/sqlite';

describe('SqliteDatabase', () => {
    let db: SqliteDatabase;

    beforeEach(() => {
        db = new SqliteDatabase(':memory:');
    });

    it('should execute an INSERT statement successfully', async () => {
        const result = await db.execute('CREATE TABLE test_table (column TEXT);');
        expect(result).toBe(true);

        const insertResult = await db.execute('INSERT INTO test_table (column) VALUES (?);', ['value']);
        expect(insertResult).toBe(true);

        const selectResult = await db.select('test_table', 'column', 'value');
        expect(selectResult).toEqual({ column: 'value' });
    });

    it('should execute an INSERT stmt and delete it', async () => {
        const result = await db.execute('CREATE TABLE test_table (column TEXT);');
        expect(result).toBe(true);

        const insertResult = await db.execute('INSERT INTO test_table (column) VALUES (?);', ['value']);
        expect(insertResult).toBe(true);

        const deleteResult = await db.delete('test_table', 'column', 'value');
        expect(deleteResult).toBe(true);

        const selectResult = await db.select('test_table', 'column', 'value');
        expect(selectResult).toEqual(null);
    })
});