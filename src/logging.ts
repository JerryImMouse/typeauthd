import winston, {format, level} from "winston";
import DailyRotateFile from 'winston-daily-rotate-file';
import { Configration } from "./config";

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
    private static _name = 'typeauthd';

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
        const config = Configration.get();

        const transports: Array<any> = [
            new winston.transports.Console({
                format: this._getConsole(),
                level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBG
            }),
        ];
        
        if (process.env.NODE_ENV === 'production') {
            transports.push(this._getFileTransport(config.logDirPath)) // log to file on prod
        } 

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

    private static _getFileTransport(path: string) {
        return new DailyRotateFile({
          filename: `${Logger._name}-%DATE%.log`,
          zippedArchive: true,
          maxSize: '10m',
          maxFiles: '14d',
          dirname: path,
          format: format.combine(
            format.timestamp(),
            format(info => {
              info.app = this._name;
              return info;
            })(),
            format.json()
          ),
        });
      }

    private constructor() {
        this._logger = this._initWinston();
    }
    
    public debug(msg: LogMsg, context?: LogCtx) {
        this._log(msg, LogLevel.DEBG, context);
    }

    public info(msg: LogMsg, context?: LogCtx) {
        this._log(msg, LogLevel.INFO, context);
    }

    public warn(msg: LogMsg, context?: LogCtx) {
        this._log(msg, LogLevel.WARN, context);
    }

    public error(msg: LogMsg, context?: LogCtx) {
        this._log(msg, LogLevel.ERRO, context);
    }

    private _log(msg: LogMsg, level: LogLevel, context?: LogCtx) {
        this._logger.log(level, msg, {context: context});
    }
}