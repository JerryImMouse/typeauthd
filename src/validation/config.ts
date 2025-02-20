import { LogLevel } from "../logging";
import { AppConfiguration, ConfigFieldValue, ConfigurationData, ConfigValidateFunctionResult, DatabaseConfiguration, HttpsConfiguration } from "../types/config";
import fs from 'node:fs';

const redirectUriRegex = /^(http|https):\/\/([A-Za-z0-9:.-\/]+)(\/auth\/login\/cb)$/;

export function _validateRedirectUri(value: ConfigFieldValue) {
    if (typeof value !== 'string')
        return [false, "Value is not a string", undefined];

    if (!redirectUriRegex.test(value))
        return [false, "Invalid format of redirect uri. Valid format: http(s)://domain/ipv4/ipv6/(pathbase|null)/auth/login/cb"];

    return [true, undefined, undefined];
}

export function _validatePathBase(value: ConfigFieldValue) {
    if (typeof value !== 'string')
        return [false, "Value is not a string", undefined];

    if (value.trim() === '' || 
       !value.trim().startsWith("/") ||
       !value.trim().endsWith("/"))
        return [false, "Invalid PathBase, PathBase should START and END with `/`, or be `/` only."];

    return [true, undefined, undefined];
}

export function _validateDatabaseProvider(value: ConfigFieldValue) {
    if (typeof value !== 'string')
        return [false, "Value is not a string", undefined];

    if (value !== 'sqlite' && value !== 'postgres')
        return [false, 'Invalid database provider specified. Allowed values are: sqlite or postgres', undefined];

    if (value === 'postgres')
        return [true, undefined, 'Postgres provider hasn\'t been tested as sqlite provider. Please, be careful.']

    return [true, undefined, undefined];
}

export function _validatePort(value: ConfigFieldValue) {
    if (typeof value !== 'number')
        return [false, "Value is not a number"];

    if (value < 0 || value > 65535)
        return [false, "Invalid port specified, allowed ports are from 0 to 65535"];

    if (value <= 1023)
        return [true, undefined, 'Specified port is often used by OS or other important network applications. Make sure this port aren\'t taken.'];
    
    return [true, undefined];
}

export function _validateLogLevel(value: ConfigFieldValue) {
    if (typeof value !== 'string')
        return [false, "Value is not a string"];

    switch (value) {
        case "debug":
        case "info":
        case "warn":
        case "error":
            break;
        default:
            return [false, `Invalid log level specified: ${value}. Allowed: debug, info, warn, error`];
    }

    return [true, undefined];
}

// post validation functions

const postgresConnectionStringRegex = /^postgresql:\/\/([a-zA-Z0-9_]+):([a-zA-Z0-9_]+)@([a-zA-Z0-9.-]+|\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){7})?:(\d{1,5})\/.+$/;

export function _postValidate(data: ConfigurationData) {
    const validationResults: ConfigValidateFunctionResult[] = [];

    validationResults.push(_postValidateSecureHTTPS(data.app));
    validationResults.push(_postValidateConnectionString(data.database));

    return validationResults;
}

function _postValidateSecureHTTPS(app: AppConfiguration): ConfigValidateFunctionResult {
    if (!app.https)
        return [false, 'app.https is not found in configuration.', undefined];

    if (!('secure' in app) || !('useSSL' in app.https))
        return [false, 'app.secure or app.https.useSSL is not found in configuration', undefined];

    if (app.https.useSSL && !app.secure) 
        return [true, undefined, 'SSL is set, but `secure` is not. You can turn on secure cookies to secure cookies with HTTPS.'];

    return [true, undefined, undefined];
}

function _postValidateConnectionString(database: DatabaseConfiguration): ConfigValidateFunctionResult {
    if (database.provider !== 'postgres')
        return [true, undefined, undefined];

    if (!postgresConnectionStringRegex.test(database.connection))
        return [false, 'Invalid postgres connection string. Valid format: postgresql://user:password@domain/ipv4/ipv6:port/dbname', undefined];

    return [true, undefined, undefined];
}