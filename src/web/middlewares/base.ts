import {Request, Response, NextFunction} from 'express';
import { Logger } from '../../logging';

const logger = Logger.get();

export function logRequest(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    res.on("finish", () => { // Log when the response is sent
        const responseTime = Date.now() - startTime;
        const logData = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            query: req.query,
            ip: req.ip,
            status: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.headers["user-agent"],
            referer: req.headers["referer"],
            contentType: req.headers["content-type"],
            authorization: req.headers["authorization"] ? "[REDACTED]" : undefined,
            body: req.method !== "GET" ? req.body : undefined,
        };

        logger.debug(`${req.method} ${req.url} - ${res.statusCode}`, logData);
    });

    next();
}