import {Request as ExRequest, Response as ExResponse} from 'express';
import { Logger } from '../logging';
import { Configration } from '../config';
import { AuthorizedRecord } from '../database/generic';

const config = Configration.get();
const CLIENT_ID = config.discord_clientId();
const CLIENT_SECRET = config.discord_clientSecret();
const REDIRECT_URI = config.discord_redirectUri();

export const DISCORD_API_URL = "https://discord.com/api/v10"

export class WebHelpers {
    
    /// Express helpers
    
    static respond(res: ExResponse, msg: string, code: number) {
        res.status(code).send(msg);
    }

    /// Discord Related Helpers

    static parseCodeQuery(req: ExRequest): DiscordCodeQuery | null {
        const query = req.query as DiscordRawCodeQuery;
        if (!query.code || !query.state) {
            return null;
        }

        return {state: query.state!, code: query.code!};
    }

    static async exchangeCode(code: string): Promise<DiscordCodeResponse | null> {
        const auth_token = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

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
                'Authorization': auth_token
            }
        });

        if (!response.ok) {
            WebHelpers.handleDiscordError(response, '[DISCORD]: Error during code exchange.');
            return null;
        }

        const tokenData: DiscordCodeResponse = await response.json();
        return tokenData;
    }

    static async identify(access_token: string): Promise<DiscordUserObject | null> {
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

    static async handleDiscordError(res: Response, msg: string) {
        const json = await res.json();
        Logger.get().error(msg, json);
    }

    /// TypeAuthD Related Helpers
    static setExtraIfAny(record: AuthorizedRecord, data: Record<string, string | number>) {
        const json = JSON.stringify(data);
        if (record.extra) {
            record.extra.json = json;
        }
    }
}

// https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-access-token-response
export interface DiscordCodeResponse {
    access_token: string,
    token_type: string,
    expires_in: number,
    refresh_token: string,
    scope: string
}

// https://discord.com/developers/docs/resources/user#user-object-user-structure
export interface DiscordUserObject {
    id: string;
    username: string;
    discriminator: string;
    global_name?: string;
    avatar?: string;
    bot?: boolean;
    system?: boolean;
    mfa_enabled?: boolean;
    banner?: string;
    accent_color?: number;
    locale?: string;
    verified?: boolean;
    email?: string;
    flags?: number;
    premium_type?: number;
    public_flags?: number;
    avatar_decoration_data?: object;
}

interface DiscordRawCodeQuery {
    state?: string,
    code?: string
}

export interface DiscordCodeQuery {
    state: string,
    code: string,
}