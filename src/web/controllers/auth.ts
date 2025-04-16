import {Request, Response, Router} from 'express';
import { WebHelpers } from '../helpers';
import { AuthorizedRecord, Database } from '../../database/generic';
import { Logger } from '../../logging';
import { LocaleManager } from '../../locale';
import { IState, LocaleExtendedRequest } from '../../types/web';
import { getLocale } from '../middlewares/auth';
import { Configration } from '../../config';
import { randomUUID } from 'crypto';
import { validateUuid } from '../../validation/uuid';
import { ErrorViewModel, LoginViewModel, SuccessViewModel } from '../models';

// database should be already initialized here
const db = Database.getDbImpl();
const locales = LocaleManager.get();
const config = Configration.get();
const logger = Logger.get();

/// Here is the format
/// getPATH_PATH_... - GET /auth/PATH/PATH/...
export class AuthController {
    public static collectToRouter() {
        const router = Router();
        router.get('/login', getLocale, AuthController.getLogin);
        router.get('/login/cb', getLocale, AuthController.getLogin_Cb);
        return router;
    }

    public static async getLogin(req: LocaleExtendedRequest, res: Response) {
        let uid = req.query['uid']?.toString() ?? undefined;
        const locale = req.locale!;
        let authLink: string | undefined;
        if (uid) {
            if (validateUuid(uid)) {
                authLink = WebHelpers.generateAuthLink(uid);
            }
        }

        new LoginViewModel(
            locales,
            authLink,
            locale,
        ).respond(res.status(200));
    }

    public static async getLogin_Cb(req: Request, res: Response) {

        const query = WebHelpers.parseCodeQuery(req);
        if (!query) {
            WebHelpers.respondErr(res, "invalid_code", 400, "invalid_code_details", config.locale);
            return;
        }

        const stateBuf = Buffer.from(query.state, 'base64').toString('utf-8');
        const decodedState: IState = JSON.parse(stateBuf);
        if (!decodedState.uid) {
            WebHelpers.respondErr(res, "Corrupted state", 400, "Corrupted state, try reauthorizing");
            return;
        }
        
        const locale = decodedState.loc ?? config.locale;

        const tokenStruct = await WebHelpers.exchangeCode(query.code, req);
        if (!tokenStruct) {
            WebHelpers.respondErr(
                res, 
                "unable_exchange_code", 
                400, 
                "unable_exchange_code_details", 
                locale
            );
            return;
        }


        const identifyScopeData = await WebHelpers.identify(tokenStruct.access_token, req);
        if (!identifyScopeData) {
            const errId = randomUUID().toString();
            const data = {
                id: errId,
                ip: req.ip,
                http_ver: req.httpVersion,
                protocol: req.protocol,
                url: req.url,

                err: "Unable to fetch identify scope",
            }

            WebHelpers.respondErrWithLogs(
                res, 
                'Unable to fetch identify scope', 
                500, 
                'You cannot do anything with this, address the issue to developer',
                errId,
                JSON.stringify(data),
                locale
            );
            return;
        }

        // if we already have a record, just update tokens and leave credentials the same, so we avoid "reauthorization", this could be critical
        // for some apps
        const foundByUid = await AuthorizedRecord.find(db, {uid: decodedState.uid});
        if (foundByUid) {
            foundByUid.access_token = tokenStruct.access_token;
            foundByUid.refresh_token = tokenStruct.refresh_token;
            foundByUid.expires = tokenStruct.expires_in;
            await foundByUid.save();

            // https://github.com/maximal/http-267
            WebHelpers.respondErr(res, "ok267", 267, "ok267_details", locale);
            logger.warn("Authenticating again, credentials left untouched", {
                uid: foundByUid.uid,
                duid: foundByUid.discord_uid
            });
            return;
        }

        const found = await AuthorizedRecord.find(db, {discord_uid: identifyScopeData.id});
        if (found) {
            found.access_token = tokenStruct.access_token;
            found.refresh_token = tokenStruct.refresh_token;
            found.expires = tokenStruct.expires_in;
            await found.save();

            // https://github.com/maximal/http-267
            WebHelpers.respondErr(res, "ok267", 267, "ok267_details", locale);
            logger.warn("Authenticating again, credentials left untouched", {
                uid: found.uid,
                duid: found.discord_uid
            });
            return;
        }
        
        const record = await AuthorizedRecord.create(
            db, 
            decodedState.uid, 
            identifyScopeData.id, 
            tokenStruct.access_token, 
            tokenStruct.refresh_token, 
            tokenStruct.expires_in
        );
        
        // first save call to fill id field, required for ensureExtra()
        await record.save();

        if (config.extraEnabled) {
            // create extra record in database (if any turned on)
            await record.ensureExtra();
            
            WebHelpers.setExtraIfAny(record, {
                name: identifyScopeData.username,
                ...(identifyScopeData.global_name !== undefined && { global_name: identifyScopeData.global_name })
            });
    
            // second save to save extra data
            await record.save();
        }

        new SuccessViewModel(
            locales,
            locale
        ).respond(res.status(200));

        logger.debug(`Successfully authenticated new record`, {
            discord_uid: identifyScopeData.id,
            user_id: decodedState,
        });
    }
}