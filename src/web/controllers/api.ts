import { Request, Response, Router } from 'express';
import { checkApiToken } from '../middlewares/auth';
import { findRecord, validateToken } from '../middlewares/api';
import { WebHelpers } from '../helpers';
import { Database } from '../../database/generic';
import { RecordExtendedRequest } from '../types';
import { Configration } from '../../config';

// database should be already initialized here
const db = Database.getDbImpl();
const config = Configration.get();
const apiStuff = [checkApiToken, findRecord, validateToken];


/// Here is the format
/// getMETHODNAME - GET /api/METHODNAME
export class ApiController {
    static collectToRouter() {
        const router = Router();
        router.get('/identify', apiStuff, this.getIdentify);
        router.get('/roles', apiStuff, this.getRoles);
        router.get('/guilds', apiStuff, this.getGuilds);
        router.get('/link', this.getLink);
        return router;
    }

    static async getIdentify(req: RecordExtendedRequest, res: Response) {
        // got via middleware, so it cannot be undefined
        const record = req.record!;

        const identifyData = await WebHelpers.identify(record.access_token);
        if (!identifyData) {
            res.status(500).json({error: 'Unable to retrieve identify data'});
            return;
        }

        res.status(200).json(identifyData);
    }

    static async getRoles(req: RecordExtendedRequest, res: Response) {
        const query = WebHelpers.validateRolesParams(req.query);
        if (!query) {
            res.status(400).send({error: 'Bad Request'});
            return;
        }
        
        const record = req.record!;

        const guildMemberData = await WebHelpers.guildMember(record.access_token, query.guildId);
        if (!guildMemberData) {
            res.status(500).json({error: 'Unable to retrieve guild member object'});
            return;
        }

        res.status(200).json({roles: guildMemberData.roles});
    }

    static async getGuilds(req: RecordExtendedRequest, res: Response) {
        const record = req.record!;
        const guilds = await WebHelpers.guilds(record.access_token);
        if (!guilds) {
            res.status(500).json({error: 'Unable to retrieve user guilds.'});
            return;
        }

        res.status(200).json({guilds: guilds});
        return;
    }

    static async getLink(req: Request, res: Response) {
        const query = WebHelpers.validateLinkParams(req.query);
        if (!query) {
            res.status(400).json({error: 'Bad Request'});
            return;
        }

        const link = WebHelpers.generateAuthLink(query.uid);
        res.status(200).json({link});
    }
}