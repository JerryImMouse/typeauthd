import winston, {format} from "winston";

export type LogMsg = string;
export type LogCtx = object;

export enum LogLevel {
    DEBG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERRO = 'error'
}

export class Logger {
    private static _instance?: Logger;

    private readonly _logger: winston.Logger;

    
    public static get() {
        if (!Logger._instance) {
            Logger._instance = new Logger();
        }
        
        return Logger._instance!;
    }

    private _initWinston() {
        const logger = winston.createLogger({
            transports: Logger._getTransports()
        });
        return logger;
    }

    private static _getTransports() {
        const transports: Array<any> = [
            new winston.transports.Console({
              format: this._getConsole(),
            }),
          ];

        return transports;
    }

    private static _getConsole() {
        return format.combine(
            format.timestamp(),
            format.printf(info => {
                const context =
                info.context !== undefined && info.context !== null
                    ? `[CONTEXT] -> ${JSON.stringify(info.context, null, 2)}`
                    : '';
                return `[${info.timestamp}] [${info.level.toUpperCase()}]: ${info.message} ${context}`;
            }),
            format.colorize({ all: true })
        );
    }

    private constructor() {
        this._logger = this._initWinston();
    }
    
    public debug(msg: LogMsg, ctx?: LogCtx) {
        this._log(msg, LogLevel.DEBG, (ctx ? {context: ctx} : undefined));
    }

    public info(msg: LogMsg, ctx?: LogCtx) {
        this._log(msg, LogLevel.INFO, (ctx ? {context: ctx} : undefined));
    }

    public warn(msg: LogMsg, ctx?: LogCtx) {
        this._log(msg, LogLevel.WARN, (ctx ? {context: ctx} : undefined));
    }

    public error(msg: LogMsg, ctx?: LogCtx) {
        this._log(msg, LogLevel.ERRO, (ctx ? {context: ctx} : undefined));
    }

    private _log(msg: LogMsg, level: LogLevel, ctx?: LogCtx) {
        this._logger.log(level, msg, (ctx ? {context: ctx} : undefined));
    }
}