import { Request as ExRequest } from "express";
import { AuthorizedRecord } from "../database/generic";
import { SearchMethod } from "../web/helpers";
import { Server } from "node:http";
import { Http2SecureServer } from "node:http2";

/// Discord Structs

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

// https://discord.com/developers/docs/resources/guild#guild-member-object-guild-member-structure
export interface DiscordGuildMemberObject {
    user?: DiscordUserObject;
    nick?: string | null;
    avatar?: string | null;
    banner?: string | null;
    roles: string[];
    joined_at: string;
    premium_since?: string | null;
    deaf: boolean;
    mute: boolean;
    flags: number;
    pending?: boolean;
    permissions?: string;
    communication_disabled_until?: string | null;
    avatar_decoration_data?: Record<string, unknown>;
}

/// https://discord.com/developers/docs/resources/user#get-current-user-guilds-example-partial-guild
export interface DiscordPartialGuildObject {
    id: string;
    name: string;
    icon: string;
    banner: string;
    owner: boolean;
    permissions: string;
    features: string[];
    approximate_member_count: number;
    approximate_presence_count: number;
}

export interface DiscordRawCodeQuery {
    state?: string,
    code?: string
}

/// TypeAuthD Helper Structs

export interface DiscordCodeQuery {
    state: string,
    code: string,
}

export interface IdentifyQueryParams {
    method: SearchMethod,
    id: string // differs depending on `method`
}

export interface RolesQueryParams extends IdentifyQueryParams {
    guildId: string
}

export interface LinkQueryParams {
    uid: string
}

export interface DataParams {
    c: string
}

/// Express Helper Structs

export interface RecordExtendedRequest extends ExRequest {
    record?: AuthorizedRecord
}

export interface LocaleExtendedRequest extends ExRequest {
    locale?: string
}

export type TypeAuthDExtendedRequest = RecordExtendedRequest | LocaleExtendedRequest;
export type AuthServer = Server | Http2SecureServer