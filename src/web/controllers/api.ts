import { Request, Response, Router } from 'express';
import { checkApiToken } from '../middlewares/auth';
import { findRecordByBody, findRecordByQuery, validateToken } from '../middlewares/api';
import { WebHelpers } from '../helpers';
import { IState, RecordExtendedRequest } from '../../types/web';
import { Database, RecordExtra } from '../../database/generic';
import { Logger } from '../../logging';

const apiStuff = [checkApiToken, findRecordByQuery, validateToken];
const dbImpl = Database.getDbImpl();
const log = Logger.get();

/// Here is the format
/// getMETHODNAME - GET /api/METHODNAME
export class ApiController {
    public static collectToRouter() {
        const router = Router();
        router.get('/uuid', apiStuff, this.getUserId);
        router.get('/identify', apiStuff, this.getIdentify);
        router.get('/roles', apiStuff, this.getRoles);
        router.get('/guilds', apiStuff, this.getGuilds);
        router.get('/extra', [checkApiToken, findRecordByQuery], this.getExtraData);
        router.patch('/extra', [checkApiToken, findRecordByQuery], this.patchExtraData);
        router.post('/delete', [checkApiToken, findRecordByBody], this.postDelete);

        router.delete('/each/extra', [checkApiToken], this.deleteEachExtraData);

        router.get('/link', this.getLink);
        return router;
    }

    public static async getUserId(req: RecordExtendedRequest, res: Response) {
        const record = req.record!;

        const uuid = record.uid;

        res.status(200).json({uuid: uuid});
    }

    public static async getIdentify(req: RecordExtendedRequest, res: Response) {
        // got via middleware, so it cannot be undefined
        const record = req.record!;

        const identifyData = await WebHelpers.identify(record.access_token, req);
        if (!identifyData) {
            res.status(500).json({error: 'Unable to retrieve identify data'});
            return;
        }

        res.status(200).json(identifyData);
    }

    public static async getRoles(req: RecordExtendedRequest, res: Response) {
        const query = WebHelpers.validateRolesParams(req.query);
        if (!query) {
            res.status(400).send({error: 'Bad Request'});
            return;
        }
        
        const record = req.record!;

        const guildMemberData = await WebHelpers.guildMember(record.access_token, query.guildId, req);
        if (!guildMemberData) {
            res.status(500).json({error: 'Unable to retrieve guild member object'});
            return;
        }

        res.status(200).json({roles: guildMemberData.roles});
    }

    public static async getExtraData(req: RecordExtendedRequest, res: Response) {
        const record = req.record!;

        record.extra = await RecordExtra.find(dbImpl, {record_id: record.id}) ?? undefined // record extended returns empty extras for perf

        if (!record.extra) {
            res.status(404).json({error: "Extras Not Found"});
            return;
        }

        res.status(200).contentType('application/json').send(record.extra.json); // manually set content-type because our `json` field is a json str already
        log.debug(`Returned extra data for ${record.discord_uid}`, JSON.parse(record.extra.json));
    }

    public static async patchExtraData(req: RecordExtendedRequest, res: Response) {
        const record = req.record!;

        record.extra = await RecordExtra.find(dbImpl, {record_id: record.id}) ?? undefined;

        if (!record.extra) {
            res.status(404).json({error: "Extras Not Found"});
            return;
        }

        const original = JSON.parse(record.extra.json);
        const merged = JSON.stringify({...original, ...req.body});
        record.extra.json = merged;
        
        await record.extra.save();
        
        res.status(200).send();
        log.debug(`Set extra data for ${record.discord_uid}`, JSON.parse(record.extra.json));
    }

    public static async deleteEachExtraData(req: Request, res: Response) {
        const fields = req.body['fields'] as string[] | undefined;
        if (!fields) {
            res.status(400).json({error: "Fields is not supplied"});
            return;
        }

        const allRecords = await RecordExtra.findAll(dbImpl);

        for (const record of allRecords) {
            try {
                const jsonData = JSON.parse(record.json);
                
                fields.forEach(field => {
                    delete jsonData[field];
                });

                record.json = JSON.stringify(jsonData);
                await record.save();
            } catch (error) {
                console.error("Failed to process record:", error);
            }
        }

        res.status(200).send();
    }

    public static async getGuilds(req: RecordExtendedRequest, res: Response) {
        const record = req.record!;
        const guilds = await WebHelpers.guilds(record.access_token, req);
        if (!guilds) {
            res.status(500).json({error: 'Unable to retrieve user guilds.'});
            return;
        }

        res.status(200).json({guilds: guilds});
        return;
    }

    public static async getLink(req: Request, res: Response) {
        const query = WebHelpers.validateLinkParams(req.query);
        if (!query) {
            res.status(400).json({error: 'Bad Request'});
            return;
        }

        const locale = req.query.loc?.toString() ?? undefined;

        const state: IState = {
            loc: locale,
            uid: query.uid,
        };

        const base64String = Buffer.from(JSON.stringify(state), 'utf-8').toString('base64');

        const link = WebHelpers.generateAuthLink(base64String);
        res.status(200).json({link});
    }

    public static async postDelete(req: RecordExtendedRequest, res: Response) {
        const record = req.record!;

        record.extra = await RecordExtra.find(dbImpl, {record_id: record.id}) ?? undefined;

        if (record.extra) {
            await record.extra.delete();
        }

        await record.delete();

        res.status(200).send();
    }
}