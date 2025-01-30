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
    admin: AdminConfiguration
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