import {Request, Response, Router} from 'express';
import { LocaleManager } from '../../locale';
import { getLocale } from '../middlewares/auth';
import { Configration } from '../../config';

import jwt from 'jsonwebtoken';

import { AuthorizedRecord, Database } from '../../database/generic';
import { LocaleExtendedRequest } from '../../types/web';
import { verifyJWT } from '../middlewares/admin';
import { IAuthorizedRecord } from '../../types/database';

const config = Configration.get();
const locales = LocaleManager.get();
const db = Database.getDbImpl();


export class AdminController {
    public static collectToRouter() {
        const router = Router();

        router.get('/login', getLocale, this.getLogin);
        router.post('/login', this.postLogin);
        router.get('/panel', [verifyJWT, getLocale], this.getPanel);
        router.post('/panel/delete', [verifyJWT], this.postDelete);

        return router;
    }

    public static async getPanel(req: LocaleExtendedRequest, res: Response) {
        const locale = req.locale!;
        let page = parseInt(req.query.page as string) || 1;
        page = page < 1 ? 1 : page;
        const offset = (page - 1) * config.adminPageSize;

        const searchText = (req.query['search'] as string) || "";

        let records = await db.selectLimitOffsetLike<IAuthorizedRecord>('authorized_records', offset, config.adminPageSize, searchText ? {
            discord_uid: searchText,
            uid: searchText
        } : undefined);

        const nextPageLink = `${config.pathBase}/admin/panel?search=${searchText}&page=${page+1}&loc=${locale ?? config.locale}`;
        const prevPageLink = `${config.pathBase}/admin/panel?search=${searchText}&page=${page-1 < 1 ? 1 : page-1}&loc=${locale ?? config.locale}`;

        const panel_title = locales.loc('panel_title', locale);
        const panel_submit_btn = locales.loc('panel_submit_btn', locale);
        const panel_delete_btn = locales.loc('panel_delete_btn', locale);

        res.render('admin_panel', {
            records,
            title: "Admin",
            panel_title,
            panel_submit_btn,
            panel_delete_btn,
            next_page: nextPageLink,
            prev_page: prevPageLink,
            cur_page: page,
            assetPrefix: config.pathBase
        });
    }

    public static async postDelete(req: Request, res: Response) {
        const discord_uid = (req.query['discord_uid'] as string) || null;
        if (!discord_uid) {
            res.redirect(`${config.pathBase}admin/panel`);
            return;
        }

        const record = await AuthorizedRecord.find(db, {discord_uid: discord_uid}, true);
        if (!record) {
            res.redirect(`${config.pathBase}admin/panel`);
            return;
        }

        if (!record.extra) {
            await record.ensureExtra()
        }

        await record.extra?.delete()
        await record.delete();
        res.redirect(`${config.pathBase}admin/panel`);
    }

    public static async getLogin(req: LocaleExtendedRequest, res: Response) {
        // locales
        const locale = req.locale!;
        const login_title = locales.loc('login_title', locale);
        const login_submit_btn = locales.loc('login_submit_btn', locale);
        const login_token_name = locales.loc('login_token_name', locale);

        res.render('admin_login', {
            login_title,
            login_token_name,
            login_submit_btn,
            assetPrefix: config.pathBase
        });
    }

    public static async postLogin(req: Request, res: Response) {
        const token = req.body['token'];
        if (!token) {
            res.redirect(`${config.pathBase}/admin/login`);
            return;
        }

        if (config.apiSecret !== token) {
            res.redirect(`${config.pathBase}/admin/login`);
            return;
        }

        // set jwt as a flag
        const jwtToken = jwt.sign({}, config.adminJwtSecret, {
            expiresIn: '1h',
            issuer: 'typeauthd'
        });

        res.cookie('typeauthd_jwt', jwtToken, {
            httpOnly: true,
            maxAge: 1 * 60 * 60 * 1000, // 1 hour in ms
            secure: config.secure,
            sameSite: 'strict'
        });

        res.redirect(`${config.pathBase}admin/panel`);
    }
}