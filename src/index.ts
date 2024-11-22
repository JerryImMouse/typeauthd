import { SqliteAuthorizedRecord, SqliteDatabase } from "./database/sqlite";

// testing field
const db = SqliteDatabase.get();
db.init().then((res) => {
    console.log(res);
});

SqliteAuthorizedRecord.create('uid', 'duid', 'access_token', 'refresh_token', 123).then((obj) => {
    obj.save();
});

SqliteAuthorizedRecord.find({id: 1}).then((res) => {
    console.log(res);
})
