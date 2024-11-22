import { Database } from "./database/generic";
import { AuthorizedRecord } from "./database/generic";

const db = Database.getDbImpl();

db.init().then(() => {
    AuthorizedRecord.create(db, 'test','test','test','test',555).then(res => {
        console.log(res);
        res.save();
    });   
})

// AuthorizedRecord.find(db, {uid: 'test'}).then(found => {
//     if (found) {
//         found.delete();
//     }
// })