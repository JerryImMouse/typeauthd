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
        } catch (err) {
            if (err instanceof Error) 
                eabort('Error during configuration setup.', mapErr(err));

            eabort('Unknown error occured during configuration setup.');
        }
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
    app: AppConfiguration
}

export interface DatabaseConfiguration {
    provider: string,
    connection: string
}

export interface AppConfiguration {
    extraEnabled: boolean
}