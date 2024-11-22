import { Logger } from "../logging";
import { IAuthorizedRecord, IAuthorizedRecordSearchOptions, IDatabase, validateSearchOpt } from "./types";

const authRecordsTableName = 'authorized_records'

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
export class AuthorizedRecord<T extends IDatabase> implements IAuthorizedRecord {
    private readonly _db: T;
    
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
        return await this._db.execute(
            `INSERT INTO ${authRecordsTableName} 
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

    static async find<T extends IDatabase>(db: T,options: IAuthorizedRecordSearchOptions): Promise<IAuthorizedRecord | null> {
        validateSearchOpt(options);
        return await db.selectOne(`SELECT * FROM ${authRecordsTableName} WHERE ${options.id ? 'id' : 'uid'} = ?;`, [(options.id ? options.id : options.uid)]);
    }

    static async create<T extends IDatabase>(db: T, uid: string, discord_uid: string, access_token: string, refresh_token: string, expires: number, id?: number): Promise<IAuthorizedRecord> {
        const recordExists = await db.selectOne<IAuthorizedRecord>(
            `SELECT * FROM ${authRecordsTableName} WHERE uid = ? OR discord_uid = ?`,
            [uid, discord_uid]
        );

        if (recordExists) {
            Logger.get().error("Attempted to create an object with the same values, try to use find() instead", {uid, discord_uid, passed_uid: uid, passed_duid: discord_uid});
            return recordExists;
        }

        return new AuthorizedRecord(db, uid, discord_uid, access_token, refresh_token, expires, id);
    }

    async delete(): Promise<boolean> {
        const searchValue = this.id ? this.id : this.uid;
        const query = `DELETE FROM ${authRecordsTableName} WHERE ${(this.id ? "id" : "uid")} = ?`;
        return this._db.execute(query, [searchValue]);
    }
}