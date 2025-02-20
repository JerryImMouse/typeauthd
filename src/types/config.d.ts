export interface ConfigurationData {
    database: DatabaseConfiguration,
    app: AppConfiguration,
    discord: DiscordConfiguration
}

export interface DatabaseConfiguration {
    provider: string,
    connection: string
}

export interface AppConfiguration {
    port: number;
    extraEnabled: boolean,
    apiSecret: string,
    logDirPath: string
    https: HttpsConfiguration,
    secure: boolean,
    pathBase: string,
    trustProxy: boolean,
    locale: string,
    admin: AdminConfiguration,
    uuidRegExp: string,
    logLevel: string,
}

export interface AdminConfiguration {
    pageSize: number,
    jwtSecret: string,
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

export type ConfigFieldValue = string | number | boolean;

// (valid, err_val, optional_warn)
export type ConfigValidateFunctionResult = [boolean, string | undefined, string | undefined];
export type ConfigValidateFunction = (value: ConfigFieldValue) => ConfigValidateFunctionResult

// (section_key, required, default_value?, specific_validate_func)
export type ConfigFieldKey<T> = [keyof T, boolean, ConfigFieldValue | undefined, ConfigValidateFunction | undefined];
