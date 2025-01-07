import { eabort, mapErr } from './helpers';

import path from 'path';
import fs from 'fs';
import { ConfigurationData } from './types/config';

const root = path.resolve(__dirname, '..');

export class Configration {
    private static readonly _configPath = path.resolve(__dirname, '..', 'appconfig.json');
    private static readonly _devConfigPath = path.resolve(__dirname, '..', 'appconfig.dev.json');

    private static _instance: Configration;
    
    private _configData!: ConfigurationData; // we are exiting on configuration fail, so ! is ok here, i think

    private constructor() {
        let configPath = Configration._configPath;

        // if there is a dev config and we are not in production environment, use it!
        if (process.env.NODE_ENV != 'production' && fs.existsSync(Configration._devConfigPath)) {
            configPath = Configration._devConfigPath;
        }

        try {
            const data = fs.readFileSync(configPath, {encoding: 'utf-8'});
            this._configData = JSON.parse(data);
            this._validate();
            this._adjustPaths();
            this._ensurePaths();
        } catch (err) {
            if (err instanceof Error) 
                eabort('Error during configuration setup.', mapErr(err));

            eabort('Unknown error occured during configuration setup.');
        }
    }

    private _adjustPaths() {
        this._configData.app.https.keyFile = path.normalize(path.resolve(root, this.httpsKeyFile));
        this._configData.app.https.certFile = path.normalize(path.resolve(root, this.httpsCertFile));
        this._configData.app.logDirPath = path.normalize(path.resolve(root, this.logDirPath));
    }

    private _ensurePaths() {
        fs.mkdirSync(path.dirname(this.httpsKeyFile), {recursive: true});
        fs.mkdirSync(path.dirname(this.httpsCertFile), {recursive: true});
        fs.mkdirSync(this.logDirPath, {recursive: true});
    }

    // little bit messy, but works
    private _validate() {
        const isString = (value: any): value is string => typeof value === 'string' && value.trim() !== '';
        const isNumber = (value: any): value is number => typeof value === 'number' && !isNaN(value);
        const isBoolean = (value: any): value is boolean => typeof value === 'boolean';
    
        const db = this._configData.database;
        if (!isString(db.provider)) 
            eabort('Invalid or missing `database.provider` in configuration.');

        if (!isString(db.connection)) 
            eabort('Invalid or missing `database.connection` in configuration.');
    

        const app = this._configData.app;
        if (!isNumber(app.port)) 
            eabort('Invalid or missing `app.port` in configuration.');

        if (!isBoolean(app.extraEnabled)) 
            eabort('Invalid or missing `app.extraEnabled` in configuration.');

        if (!isString(app.jwtSecret)) 
            eabort('Invalid or missing `app.jwtSecret` in configuration.');

        if (!isString(app.apiSecret)) 
            eabort('Invalid or missing `app.apiSecret` in configuration.');

        if (!isString(app.logDirPath))
            eabort('Invalid or missing `app.logDirPath` in configuration.');

        if (!isString(app.locale))
            eabort('Invalid or missing `app.locale` in configuration.');
    
        const https = app.https;
        if (!isBoolean(https.useSSL)) 
            eabort('Invalid or missing `app.https.useSSL` in configuration.');

        if (!isString(https.keyFile)) 
            eabort('Invalid or missing `app.https.keyFile` in configuration.');

        if (!isString(https.certFile)) 
            eabort('Invalid or missing `app.https.certFile` in configuration.');
    

        const discord = this._configData.discord;
        if (!isString(discord.clientId)) 
            eabort('Invalid or missing `discord.clientId` in configuration.');

        if (!isString(discord.clientSecret)) 
            eabort('Invalid or missing `discord.clientSecret` in configuration.');

        if (!isString(discord.redirectUri)) 
            eabort('Invalid or missing `discord.redirectUri` in configuration.');
    }

    /// Getters

    public get port() {
        return this._configData.app.port;
    }

    public get databaseProvider() {
        return this._configData.database.provider;
    }

    public get databaseConnectionStr() {
        return this._configData.database.connection;
    }

    public get extraEnabled() {
        return this._configData.app.extraEnabled;
    }

    public get jwtSecret() {
        return this._configData.app.jwtSecret;
    }

    public get apiSecret() {
        return this._configData.app.apiSecret;
    }

    public get logDirPath() {
        return this._configData.app.logDirPath;
    }

    public get locale() {
        return this._configData.app.locale;
    }

    public get httpsUseSSL() {
        return this._configData.app.https.useSSL;
    }

    public get httpsKeyFile() {
        return this._configData.app.https.keyFile;
    }

    public get httpsCertFile() {
        return this._configData.app.https.certFile;
    }

    public get discordClientId() {
        return this._configData.discord.clientId;
    }

    public get discordClientSecret() {
        return this._configData.discord.clientSecret;
    }

    public get discordRedirectUri() {
        return this._configData.discord.redirectUri;
    }

    /// Singleton implementation
    
    public static get() {
        if (!Configration._instance) {
            Configration._instance = new Configration();
        }

        return Configration._instance!;
    }
}