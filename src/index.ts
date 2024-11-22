import { SqliteDatabase } from "./database/sqlite";
import { AuthorizedRecord } from "./database/generic";

const db = SqliteDatabase.get();

AuthorizedRecord.find(db, {uid: "test"}).then(obj => {
    console.log(obj);
});