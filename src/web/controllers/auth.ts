import {Request, Response, Router} from 'express';
import { WebHelpers } from '../helpers';
import { AuthorizedRecord, Database } from '../../database/generic';

// database should be already initialized here
const db = Database.getDbImpl();

/// Here is the format
/// getPATH_PATH_... - GET /auth/PATH/PATH/...
export class AuthController {
    public static collectToRouter() {
        const router = Router();
        router.get('/login', AuthController.getLogin);
        router.get('/login/cb', AuthController.getLogin_Cb);
        return router;
    }

    public static async getLogin(req: Request, res: Response) {
        const query = WebHelpers.validateLinkParams(req.query);
        if (!query) {
            
        }

        res.render('login', {title: 'Login'});
    }

    public static async getLogin_Cb(req: Request, res: Response) {
        const query = WebHelpers.parseCodeQuery(req);
        if (!query) {
            WebHelpers.respond(res, 'Invalid Code provided', 400);
            return;
        }

        const tokenStruct = await WebHelpers.exchangeCode(query.code);
        if (!tokenStruct) {
            WebHelpers.respond(res, 'Unable to exchange code', 400);
            return;
        }

        const identifyScopeData = await WebHelpers.identify(tokenStruct.access_token);
        if (!identifyScopeData) {
            WebHelpers.respond(res, 'Unable to fetch identify scope', 500);
            return;
        }

        // if we already have a record, just update tokens and leave credentials the same, so we avoid "reauthorization", this could be critical
        // for some apps
        const found = await AuthorizedRecord.find(db, {discord_uid: identifyScopeData.id});
        if (found) {
            found.access_token = tokenStruct.access_token;
            found.refresh_token = tokenStruct.refresh_token;
            found.expires = tokenStruct.expires_in;
            await found.save();

            // https://github.com/maximal/http-267
            WebHelpers.respond(res, 'Tokens updated, but credentials left untouched', 267);
            return;
        }

        const record = await AuthorizedRecord.create(db, query.state, identifyScopeData.id, tokenStruct.access_token, tokenStruct.refresh_token, tokenStruct.expires_in);
        
        // first save call to fill id field, required for ensureExtra()
        await record.save();
        // create extra record in database (if any turned on)
        await record.ensureExtra();
        
        WebHelpers.setExtraIfAny(record, {
            name: identifyScopeData.username,
            ...(identifyScopeData.global_name !== undefined && { global_name: identifyScopeData.global_name })
        });

        // second save to save extra data
        await record.save();

        res.send('Success');
    }
}