import {Request, Response, NextFunction} from 'express';
import { Configration } from '../../config';
import { WebHelpers } from '../helpers';
import { RecordExtendedRequest } from '../types';
import { Database } from '../../database/generic';

const config = Configration.get();
const db = Database.getDbImpl();

export function checkApiToken(req: Request, res: Response, next: NextFunction): void  {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    const token = authHeader.split(' ')[1];
    const our_secret = config.app_apiSecret();
    if (our_secret !== token) {
        res.status(401).json({error: 'Unauthorized'});
        return;
    }

    next();
}