import { Response, NextFunction } from "express";
import { WebHelpers } from "../helpers";
import { RecordExtendedRequest } from "../../types/web";
import { Database } from "../../database/generic";

const db = Database.getDbImpl();

export async function findRecord(req: RecordExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    const query = WebHelpers.validateIdentifyParams(req.query);
    if (!query) {
        res.status(400).send({error: 'Bad Request'});
        return;
    }

    let record = await WebHelpers.fetchRecordByMethod(db, query.id, query.method);

    if (!record) {
        res.status(404).json({error: 'No record found'});
        return;
    }

    req.record = record;
    next();
}

export async function validateToken(req: RecordExtendedRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.record) {
        res.status(500).send({error: 'Unable to find record'});
        return;
    }

    const record = req.record;
    const result = await WebHelpers.ensureToken(record, true);
    if (!result) {
        res.status(500).send({error: 'Unable to refresh token'});
        return;
    }

    next();
}