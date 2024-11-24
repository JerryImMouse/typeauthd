import {Logger} from './logging';
import { eabort, mapErr } from './helpers';

import path from 'path';
import fs from 'fs';

export class Configration {
    private readonly _logger: Logger;
    private static readonly _configPath = path.resolve(__dirname, '..', 'appconfig.json');
    private static _instance: Configration;

    private _configData!: ConfigurationData; // we exiting on configuration fail, so this is ok

    private constructor() {
        this._logger = Logger.get();
        try {
            const data = fs.readFileSync(Configration._configPath, {encoding: 'utf-8'});
            this._configData = JSON.parse(data);
            this._adjustPaths();
        } catch (err) {
            if (err instanceof Error) 
                eabort('Error during configuration setup.', mapErr(err));

            eabort('Unknown error occured during configuration setup.');
        }
    }

    private _adjustPaths() {
        this._configData.app.https.keyFile = path.normalize(path.resolve(__dirname, this.app_https_keyFile()));
        this._configData.app.https.certFile = path.normalize(path.resolve(__dirname, this.app_https_certFile()));
    }

    /// Getters

    public port() {
        return this._configData.port;
    }

    public database_provider() {
        return this._configData.database.provider;
    }

    public database_connection() {
        return this._configData.database.connection;
    }

    public app_extraEnabled() {
        return this._configData.app.extraEnabled;
    }

    public app_jwtSecret() {
        return this._configData.app.jwtSecret;
    }

    public app_apiSecret() {
        return this._configData.app.apiSecret;
    }

    public app_https_useSSL() {
        return this._configData.app.https.useSSL;
    }

    public app_https_keyFile() {
        return this._configData.app.https.keyFile;
    }

    public app_https_certFile() {
        return this._configData.app.https.certFile;
    }

    public discord_clientId() {
        return this._configData.discord.clientId;
    }

    public discord_clientSecret() {
        return this._configData.discord.clientSecret;
    }

    public discord_redirectUri() {
        return this._configData.discord.redirectUri;
    }

    /// Special-Getter to get the only instance of Configuration
    
    public static get() {
        if (!Configration._instance) {
            Configration._instance = new Configration();
        }

        return Configration._instance!;
    }
}

export interface ConfigurationData {
    port: number;
    database: DatabaseConfiguration,
    app: AppConfiguration,
    discord: DiscordConfiguration
}

export interface DatabaseConfiguration {
    provider: string,
    connection: string
}

export interface AppConfiguration {
    extraEnabled: boolean,
    jwtSecret: string,
    apiSecret: string,
    https: HttpsConfiguration
}

export interface HttpsConfiguration {
    useSSL: boolean,
    keyFile: string,
    certFile: string
}

export interface DiscordConfiguration {
    clientId: string,
    clientSecret: string,
    redirectUri: string
}