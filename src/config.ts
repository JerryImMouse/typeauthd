import { cfgabort, mapErr } from './helpers';

import path from 'path';
import fs from 'fs';
import { AdminConfiguration, AppConfiguration, ConfigFieldKey, ConfigurationData, DatabaseConfiguration, DiscordConfiguration, HttpsConfiguration } from './types/config';

// keys from /src/types/config.d.ts, needed to validate configuration
export const discordConfigurationKeys = [
    ['clientId', true, undefined],
    ['clientSecret', true, undefined],
    ['redirectUri', true, undefined],
] as Array<ConfigFieldKey<DiscordConfiguration>>;

export const httpsConfigurationKeys = [
    ['useSSL', false, false],
    ['keyFile', false, ""],
    ['certFile', false, ""],
] as Array<ConfigFieldKey<HttpsConfiguration>>;

export const adminConfigurationKeys = [
    ['pageSize', false, 30],
    ['jwtSecret', true, undefined],
] as Array<ConfigFieldKey<AdminConfiguration>>;

export const appConfigurationKeys = [
    ['port', false, 2424],
    ['extraEnabled', false, true],
    ['apiSecret', true, undefined],
    ['logDirPath', false, './logs/'],
    ['https', false, {
        'useSSL': false,
        'keyFile': "",
        'certFile': ""
    }],
    ['secure', false, false],
    ['pathBase', false, '/'],
    ['trustProxy', false, false],
    ['locale', false, 'en'],
    ['admin', true, undefined],
] as Array<ConfigFieldKey<AppConfiguration>>;

export const databaseConfigurationKeys = [
    ['provider', false, 'sqlite'],
    ['connection', false, 'app.sqlite'],
] as Array<ConfigFieldKey<DatabaseConfiguration>>;

export const configurationDataKeys = [
    ['database', false, {
        'provider': 'sqlite',
        'connection': 'app.sqlite'
    }],
    ['app', true, undefined],
    ['discord', true, undefined]
] as Array<ConfigFieldKey<ConfigurationData>>;


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
                cfgabort(`Error during configuration setup. Error: ${JSON.stringify(mapErr(err))}`);

            cfgabort('Unknown error occured during configuration setup.');
        }
    }

    // #region HelperMethods

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

    private _validate() {
        const missingFields: string[] = [];

        const validateSection = <T>(section: T, sectionName: string, keys: ConfigFieldKey<T>[]) => {
            if (typeof section !== 'object') {
                cfgabort("Invalid usage of validateSection() method.");
                return;
            }
            
            if (!section) {
                missingFields.push(`Missing section: ${sectionName}`);
                return;
            }

            keys.forEach(([key, required, defaultValue]) => {
                if (!(key in section)) {
                    if (required) {
                        missingFields.push(`Missing required field in ${sectionName}: ${String(key)}`);
                    } else {
                        (section as any)[key] = defaultValue;
                    }
                }
            });
        };

        if (this._configData.database)
            validateSection(this._configData.database, 'database', databaseConfigurationKeys);

        if (this._configData.app)
            validateSection(this._configData.app, 'app', appConfigurationKeys);

        if (this._configData.discord)
            validateSection(this._configData.discord, 'discord', discordConfigurationKeys);
        
        if (this._configData.app.https) {
            validateSection(this._configData.app.https, 'https', httpsConfigurationKeys);
        }
        
        if (this._configData.app.admin) {
            validateSection(this._configData.app.admin, 'admin', adminConfigurationKeys);
        }

        validateSection(this._configData, 'root', configurationDataKeys);

        if (missingFields.length > 0) {
            cfgabort(`Invalid configuration:\n${missingFields.join('\n')}`);
        }
    }

    // #endregion

    // #region Getters

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

    public get adminJwtSecret() {
        return this._configData.app.admin.jwtSecret;
    }

    public get adminPageSize() {
        return this._configData.app.admin.pageSize;
    }

    public get pathBase() {
        return this._configData.app.pathBase;
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

    public get trustProxy() {
        return this._configData.app.trustProxy;
    }

    public get secure() {
        return this._configData.app.secure;
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

    // #endregion

    /// Singleton implementation
    
    public static get() {
        if (!Configration._instance) {
            Configration._instance = new Configration();
        }

        return Configration._instance!;
    }
}