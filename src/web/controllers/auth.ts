import {Request, Response, Router} from 'express';
import { WebHelpers } from '../helpers';
import { AuthorizedRecord, Database } from '../../database/generic';

// database should be already initialized here
const db = Database.getDbImpl();

/// Here is the format
/// getPATH_PATH_... - GET /auth/PATH/PATH/...
export class AuthController {
    static collectToRouter() {
        const router = Router();
        router.get('/login', AuthController.getLogin);
        router.get('/login/cb', AuthController.getLogin_Cb);
        return router;
    }

    static async getLogin(req: Request, res: Response) {
        
    }

    static async getLogin_Cb(req: Request, res: Response) {
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