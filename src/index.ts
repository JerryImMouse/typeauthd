import { Database } from "./database/generic";
import { AuthorizedRecord } from "./database/generic";

const db = Database.getDbImpl();

db.init().then(() => {
    AuthorizedRecord.find(db, {uid: 'test'}).then(found => {
        if (found) {
            console.log(found);
            found.access_token = 'hello, world!';
            found.save().then(() => {
                console.log(new Date(found.updated_at));
            })
        }
    })
    // AuthorizedRecord.create(db, 'test','test','test','test',555).then(res => {
    //     res.save().then(() => {
    //         res.ensureExtra(JSON.stringify({given: 1})).then(() => {
    //             console.log(res);
    //         })
    //     });
    // });     
})
