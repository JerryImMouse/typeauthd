import {Request, Response, Router} from 'express';
import { WebHelpers } from '../helpers';
import { AuthorizedRecord, Database } from '../../database/generic';
import { Logger } from '../../logging';
import { LocaleManager } from '../../locale';
import { LocaleExtendedRequest } from '../../types/web';
import { getLocale } from '../middlewares/auth';
import { Configration } from '../../config';
import { randomUUID } from 'crypto';
import { validateUuid } from '../../validation/uuid';

// database should be already initialized here
const db = Database.getDbImpl();
const locales = LocaleManager.get();
const config = Configration.get();
const logger = Logger.get();

/// Here is the format
/// getPATH_PATH_... - GET /auth/PATH/PATH/...
export class AuthController {
    private static _logger = Logger.get();

    public static collectToRouter() {
        const router = Router();
        router.get('/login', getLocale, AuthController.getLogin);
        router.get('/login/cb', getLocale, AuthController.getLogin_Cb);
        return router;
    }

    public static async getLogin(req: LocaleExtendedRequest, res: Response) {
        let uid: string | undefined = req.query['uid']?.toString() ?? "";
        
        if (!validateUuid(uid))
            uid = undefined;
        

        const locale = req.locale!;
        const auth_required = locales.loc('auth_required', locale);
        const auth_required_details = uid ? locales.loc('auth_required_details_uid', locale) : locales.loc('auth_required_details', locale); 
        const auth_btn = locales.loc('auth_btn', locale);
        
        let authLink: string | undefined;
        if (uid)
            authLink = WebHelpers.generateAuthLink(btoa(uid));
        

        res.render('login', {
            title: "Login", 
            auth_required, 
            auth_required_details, 
            authLink, auth_btn, 
            assetPrefix: config.pathBase}
        );
    }

    public static async getLogin_Cb(req: LocaleExtendedRequest, res: Response) {
        const locale = req.locale!;

        const query = WebHelpers.parseCodeQuery(req);
        if (!query) {
            const title = locales.loc("invalid_code", locale);
            const desc = locales.loc("invalid_code_details", locale);

            WebHelpers.respondErr(res, title, 400, desc, locale);
            return;
        }

        const tokenStruct = await WebHelpers.exchangeCode(query.code, req);
        if (!tokenStruct) {
            const title = locales.loc("unable_exchange_code", locale);
            const desc = locales.loc("unable_exchange_code_details", locale);

            WebHelpers.respondErr(res, title, 400, desc, locale);
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
        const found = await AuthorizedRecord.find(db, {discord_uid: identifyScopeData.id});
        if (found) {
            found.access_token = tokenStruct.access_token;
            found.refresh_token = tokenStruct.refresh_token;
            found.expires = tokenStruct.expires_in;
            await found.save();

            // https://github.com/maximal/http-267
            const title = locales.loc('ok267', locale);
            const desc = locales.loc('ok267_details', locale);

            WebHelpers.respondErr(res, title, 267, desc, locale);
            this._logger.warn("Authenticating again, credentials left untouched", {
                uid: found.uid,
                duid: found.discord_uid
            });
            return;
        }

        const decodedState = atob(query.state);
        const record = await AuthorizedRecord.create(
            db, 
            decodedState, 
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

        const auth_success = locales.loc('auth_success', locale);
        const auth_success_details = locales.loc('auth_success_details', locale);

        res.render('success', {
            title: "Success", 
            auth_success, 
            auth_success_details, 
            assetPrefix: config.pathBase}
        );

        logger.debug(`Successfully authenticated new record`, {
            discord_uid: identifyScopeData.id,
            user_id: decodedState,
        });
    }
}