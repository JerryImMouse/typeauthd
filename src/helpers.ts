import { Server } from 'http';
import {LogCtx, Logger, LogMsg} from './logging';
import { Database } from './database/generic';
import http2, {Http2SecureServer} from 'http2';
import { Configration } from './config';
import express from 'express';
import fs from 'node:fs';
import http from 'http';

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

export function getSignalHandler(signal: string, server: Server | Http2SecureServer): () => void {
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

export function createServer(secure: boolean, app: express.Application): Server | Http2SecureServer {
    const config = Configration.get();
    if (secure) {
        const key = fs.readFileSync(config.app_https_keyFile());
        const cert = fs.readFileSync(config.app_https_certFile());
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