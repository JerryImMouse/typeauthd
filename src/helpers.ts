import http from 'http';
import http2 from 'http2';
import express from 'express';
import fs from 'node:fs';

import { LogCtx, Logger, LogMsg } from './logging';
import { Database } from './database/generic';
import { Configration } from './config';
import { AuthServer } from './types/web';

export function eabort(msg: LogMsg, ctx?: LogCtx, exitCode: number = 1) {
    const logger = Logger.get();
    logger.error(msg, ctx);
    process.exit(exitCode);
}

export function mapErr(err: Error) {
    return {
        msg: err.message,
        stack: err.stack
    }
}

export function getSignalHandler(signal: string, server: AuthServer): () => void {
    return () => {
        const logger = Logger.get();
        const db = Database.getDbImpl();
        logger.info(`Recieved ${signal}.`);

        server.close(() => {
            logger.info("Express server stopped.");
            db.close();
            logger.info("Database connection closed");
        });

        process.exit(1);
    }
}

export function createServer(secure: boolean, app: express.Application): AuthServer {
    const config = Configration.get();
    if (secure) {
        const key = fs.readFileSync(config.httpsKeyFile);
        const cert = fs.readFileSync(config.httpsCertFile);
        const options = {
            key: key,
            cert: cert,
            allowHTTP1: true
        };

        return http2.createSecureServer(options, app);
    } else {
        return http.createServer(app);
    }
}