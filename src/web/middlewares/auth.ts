import {Request, Response, NextFunction} from 'express';
import { Configration } from '../../config';
import { Database } from '../../database/generic';
import { LocaleExtendedRequest } from '../../types/web';

const config = Configration.get();
const db = Database.getDbImpl();

export function checkApiToken(req: Request, res: Response, next: NextFunction): void  {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    const token = authHeader.split(' ')[1];
    const our_secret = config.apiSecret;
    if (our_secret !== token) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    next();
}

export function getLocale(req: LocaleExtendedRequest, res: Response, next: NextFunction): void {
    req.locale = req.query['loc']?.toString() ?? config.locale;
    next();
}