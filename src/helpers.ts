import { Server } from 'http';
import {LogCtx, Logger, LogMsg} from './logging';
import { Database } from './database/generic';

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

export function getSignalHandler(signal: string, server: Server): () => void {
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