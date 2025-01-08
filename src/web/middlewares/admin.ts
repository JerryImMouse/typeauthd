import { Request, Response, NextFunction } from "express";
import { Configration } from '../../config';
import { Logger } from "../../logging";

import jwt from 'jsonwebtoken';
import { mapErr } from "../../helpers";

const config = Configration.get()
const logger = Logger.get();

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
    const jwtToken = req.cookies?.['typeauthd_jwt'];
    if (!jwtToken) {
        res.redirect(config.pathBase + 'login');
        return;
    }

    try {
        jwt.verify(jwtToken, config.adminJwtSecret, {
            issuer: 'typeauthd',
        });
        
        next();
    } catch (error) {
        if (error instanceof Error) {
            logger.warn("Failed to verify JWT token.", {token: jwtToken, ip: req.ip, err: mapErr(error)});
        }
    }
}