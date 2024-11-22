import {LogCtx, Logger, LogMsg} from './logging';

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