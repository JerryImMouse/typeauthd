import { mapErr } from './helpers';

import { Logger } from './logging';
import path from 'path';
import fs from 'fs';
import { 
    _postValidate, 
    _validatePathBase, 
    _validateRedirectUri 
} from './validation/config';
import { 
    AdminConfiguration, 
    AppConfiguration, 
    ConfigFieldKey, 
    ConfigurationData, 
    DatabaseConfiguration, 
    DiscordConfiguration, 
    HttpsConfiguration 
} from './types/config';

import {
    _validateDatabaseProvider,
    _validatePort
} from './validation/config';

// keys from /src/types/config.d.ts, needed to validate configuration
export const discordConfigurationKeys = [
    ['clientId', true, undefined, undefined],
    ['clientSecret', true, undefined, undefined],
    ['redirectUri', true, undefined, _validateRedirectUri],
] as Array<ConfigFieldKey<DiscordConfiguration>>;

export const httpsConfigurationKeys = [
    ['useSSL', false, false, undefined],
    ['keyFile', false, "", undefined],
    ['certFile', false, "", undefined],
] as Array<ConfigFieldKey<HttpsConfiguration>>;

export const adminConfigurationKeys = [
    ['pageSize', false, 30, undefined],
    ['jwtSecret', true, undefined, undefined],
] as Array<ConfigFieldKey<AdminConfiguration>>;

export const appConfigurationKeys = [
    ['port', false, 2424, _validatePort],
    ['extraEnabled', false, true, undefined],
    ['apiSecret', true, undefined, undefined],
    ['logDirPath', false, './logs/', undefined],
    ['https', false, {
        'useSSL': false,
        'keyFile': "",
        'certFile': ""
    }, undefined],
    ['secure', false, false, undefined],
    ['pathBase', false, '/', _validatePathBase],
    ['trustProxy', false, false, undefined],
    ['locale', false, 'en', undefined],
    ['admin', true, undefined, undefined],
] as Array<ConfigFieldKey<AppConfiguration>>;

export const databaseConfigurationKeys = [
    ['provider', false, 'sqlite', _validateDatabaseProvider],
    ['connection', false, 'app.sqlite', undefined],
] as Array<ConfigFieldKey<DatabaseConfiguration>>;

export const configurationDataKeys = [
    ['database', false, {
        'provider': 'sqlite',
        'connection': 'app.sqlite'
    }, undefined],
    ['app', true, undefined, undefined],
    ['discord', true, undefined, undefined]
] as Array<ConfigFieldKey<ConfigurationData>>;


const root = path.resolve(__dirname, '..');

export class Configration {
    private static readonly _configPath = path.resolve(__dirname, '..', 'appconfig.json');
    private static readonly _devConfigPath = path.resolve(__dirname, '..', 'appconfig.dev.json');

    private static _instance: Configration;
    
    private _configData!: ConfigurationData; // we are exiting on configuration fail, so ! is ok here, i think
    private _logger!: Logger;

    private constructor() {
        let configPath = Configration._configPath;
        this._logger = Logger.getLiteLogger();

        // if there is a dev config and we are not in production environment, use it!
        if (process.env.NODE_ENV != 'production' && fs.existsSync(Configration._devConfigPath)) {
            configPath = Configration._devConfigPath;
        }

        try {
            const data = fs.readFileSync(configPath, {encoding: 'utf-8'});
            this._configData = JSON.parse(data);
            this._adjustPaths();
            this._ensurePaths();
            this._validate();
        } catch (err) {
            if (err instanceof Error) 
                this._logger.error(`Error during configuration setup.`, mapErr(err));

            this._logger.error('Unknown error occured during configuration setup.');
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
                this._logger.error("Invalid usage of validateSection() method.", {sectionName});
                process.exit(1);
            }
            
            if (!section) {
                missingFields.push(`Missing section: ${sectionName}`);
                return;
            }

            keys.forEach(([key, required, defaultValue, validateFunction]) => {
                if (key in section && validateFunction) {
                    const validationResult = validateFunction((section as any)[key]);

                    if (!validationResult[0]) {
                        this._logger.error(`Validation failed for ${sectionName}.${String(key)}.`,{ error: validationResult[1] });
                        process.exit(1);
                    }

                    if (validationResult[2])
                        this._logger.warn(`Validation warn for ${sectionName}.${String(key)}.`, {warn: validationResult[2]});

                } else if (!(key in section)) {
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
            const err = missingFields.join('\n');
            this._logger.error(`Invalid configuration.`, {missingFields: err});
            process.exit(1);
        }

        const results = _postValidate(this._configData)
        let anyFailed = false;
        results.forEach((result) => {
            if (!result[0]) {
                this._logger.error(`Post validation failed: ${result[1]}`);
                anyFailed = true;
            }

            if (result[2])
                this._logger.warn(`Post validation warning: ${result[2]}`);
        });

        if (anyFailed)
            process.exit(1);
    }

    // #endregion

    // #region Getters

    public get all() {
        return this._configData;
    }

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