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
    jwtSecret: string,
    apiSecret: string,
    logDirPath: string
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