import {Request as ExRequest, Response as ExResponse} from 'express';
import { Logger } from '../logging';
import { Configration } from '../config';
import { AuthorizedRecord } from '../database/generic';
import { DiscordCodeQuery, DiscordCodeResponse, DiscordGuildMemberObject, DiscordPartialGuildObject, DiscordRawCodeQuery, DiscordUserObject, IdentifyQueryParams, LinkQueryParams, RolesQueryParams } from '../types/web';
import { IDatabase } from '../types/database';


const config = Configration.get();
const CLIENT_ID = config.discordClientId;
const CLIENT_SECRET = config.discordClientSecret;
const REDIRECT_URI = config.discordRedirectUri;
const CLIENT_TOKEN = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

export const DISCORD_API_URL = "https://discord.com/api/v10"

export enum SearchMethod {
    DISCORD = 'discord',
    UID = 'uid'
}

export class WebHelpers {
    
    /// Express helpers
    
    public static respond(res: ExResponse, msg: string, code: number) {
        res.status(code).json({error: msg});
    }

    /// Discord Related Helpers

    public static parseCodeQuery(req: ExRequest): DiscordCodeQuery | null {
        const query = req.query as DiscordRawCodeQuery;
        if (!query.code || !query.state) {
            return null;
        }

        return {state: query.state!, code: query.code!};
    }

    public static async exchangeCode(code: string): Promise<DiscordCodeResponse | null> {
        const params = new URLSearchParams({
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': REDIRECT_URI
        });

        const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
            method: 'POST',
            body: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': CLIENT_TOKEN
            }
        });

        if (!response.ok) {
            WebHelpers.handleDiscordError(response, '[DISCORD]: Error during code exchange.');
            return null;
        }

        const tokenData: DiscordCodeResponse = await response.json();
        return tokenData;
    }

    public static async identify(access_token: string): Promise<DiscordUserObject | null> {
        const response = await fetch(`${DISCORD_API_URL}/users/@me`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (!response.ok) {
            this.handleDiscordError(response, '[DISCORD] Error fetching identify scope.');
            return null;
        }

        return await response.json();
    }

    public static async guildMember(access_token: string, guildId: string): Promise<DiscordGuildMemberObject | null> {
        const uri = `${DISCORD_API_URL}/users/@me/guilds/${guildId}/member`;
        const response = await fetch(uri, {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (!response.ok) {
            this.handleDiscordError(response, `[DISCORD] Failed to retrieve guild member.`);
            return null;
        }

        return response.json();
    }

    public static async guilds(access_token: string): Promise<DiscordPartialGuildObject[] | null> {
        const uri = `${DISCORD_API_URL}/users/@me/guilds`;
        const response = await fetch(uri, {
            method: 'get',
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        });

        if (!response.ok) {
            this.handleDiscordError(response, `[DISCORD] Failed to retrieve user guilds.`);
            return null;
        }

        return response.json();
    }

    public static async ensureToken(record: AuthorizedRecord, httpCheck: boolean = false): Promise<boolean> {
        if (httpCheck) {
            const response = await fetch(`${DISCORD_API_URL}/users/@me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${record.access_token}`
                }
            });
    
            // it means our token is not valid
            if (!response.ok) {
                Logger.get().debug("[DISCORD] Access token failed to retieve data, refreshing...", {statusCode: response.status})
                const result = await WebHelpers.refreshToken(record, true);
                return result;
            }
        }

        const recordUpdateDate = new Date(record.updated_at);
        const currentDate = new Date();

        const thresholdDate = new Date(currentDate.getTime() - record.expires * 1000);

        if (recordUpdateDate >= thresholdDate)
            return true;

        Logger.get().debug('[DISCORD] Token expired by expire time, refreshing...', {uid: record.uid, recordUpdateDate: recordUpdateDate, currentDate: currentDate, expires: record.expires});
        return await this.refreshToken(record, true);
    }

    public static async refreshToken(record: AuthorizedRecord, save: boolean = true): Promise<boolean> {
        const refreshToken = record.refresh_token;
        const params = new URLSearchParams({
            'grant_type': 'refresh_token',
            'refresh_token': refreshToken
        });

        const response = await fetch(`${DISCORD_API_URL}/oauth2/token`, {
            method: 'post',
            body: params.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': CLIENT_TOKEN
            }
        });

        if (!response.ok) {
            this.handleDiscordError(response, `[DISCORD] Failed to refresh Discord Token for ${record.uid}|${record.discord_uid}.`);
            return false;
        }

        const data = await response.json() as DiscordCodeResponse;
        record.access_token = data.access_token;
        record.expires = data.expires_in;
        record.refresh_token = data.refresh_token;
        await record.save();

        return true;
    }


    public static async handleDiscordError(res: Response, msg: string) {
        const json = await res.json();
        Logger.get().error(msg, json);
    }

    /// TypeAuthD Related Helpers

    public static setExtraIfAny(record: AuthorizedRecord, data: Record<string, string | number>) {
        const json = JSON.stringify(data);
        if (record.extra) {
            record.extra.json = json;
        }
    }

    public static validateIdentifyParams(query: any): IdentifyQueryParams | null {
        if (!query || typeof query !== 'object') {
            return null;
        }
    
        const { method, id } = query;
        if (!Object.values(SearchMethod).includes(method)) {
            return null;
        }
    
        if (typeof id !== 'string' || id.trim() === '') {
            return null;
        }
    
        return { method, id } as IdentifyQueryParams;
    }

    public static validateRolesParams(query: any): RolesQueryParams | null {
        if (!query || typeof query !== 'object') {
            return null;
        }
    
        const { method, id, guildId } = query;
        if (!Object.values(SearchMethod).includes(method)) {
            return null;
        }
    
        if (typeof id !== 'string' || id.trim() === '') {
            return null;
        }

        if (typeof guildId !== 'string' || id.trim() === '') {
            return null;
        }
    
        return { method, id, guildId } as RolesQueryParams;
    }

    public static validateLinkParams(query: any): LinkQueryParams | null {
        if (!query || typeof query !== 'object') {
            return null;
        }

        const {uid} = query;
        if (typeof uid !== 'string' || uid.trim() === '') {
            return null;
        }

        return { uid } as LinkQueryParams;
    }

    public static async fetchRecordByMethod(db: IDatabase, id: string, method: SearchMethod): Promise<AuthorizedRecord | undefined> {
        let record: AuthorizedRecord | undefined = undefined;

        switch (method) {
            case SearchMethod.DISCORD: {
                record = await AuthorizedRecord.find(db, {discord_uid: id}) ?? undefined;
                break;
            }
            case SearchMethod.UID: {
                record = await AuthorizedRecord.find(db, {uid: id}) ?? undefined;
                break;
            }
        }

        return record;
    }

    public static generateAuthLink(uid: string): string {
        const DISCORD_LINK_TEMPLATE = `https://discord.com/oauth2/authorize`;
        const encodedUri = encodeURI(REDIRECT_URI);
        const scopeArr = `scope=identify+guilds+guilds.members.read`;

        const link = `${DISCORD_LINK_TEMPLATE}?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodedUri}&${scopeArr}&state=${uid}`;
        return link;
    }
}