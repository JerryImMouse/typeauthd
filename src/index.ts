import { Database } from "./database/generic";
import { AuthorizedRecord } from "./database/generic";

const db = Database.getDbImpl();

db.init().then(() => {
    AuthorizedRecord.create(db, 'test','test','test','test',555).then(res => {
        res.save().then(() => {
            res.ensureExtra(JSON.stringify({given: 1})).then(() => {
                console.log(res);
            })
        });
    });   
})

// AuthorizedRecord.find(db, {uid: 'test'}).then(found => {
//     if (found) {
//         found.delete();
//     }
// })