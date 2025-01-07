import {Request, Response, Router} from 'express';
import { WebHelpers } from '../helpers';

export class RootController {
    public static collectToRouter() {
        const router = Router();
        router.get('/', this.getRoot);
        router.get('/logs', this.getLogs);
        return router;
    }

    public static async getRoot(req: Request, res: Response) {
        res.redirect('auth/login');
    }

    public static async getLogs(req: Request, res: Response) {
        const data = WebHelpers.validateDataParams(req.query);

        if (!data) {
            res.status(400).json({error: "Expected data to be provided!"});
            return;
        }

        res.set({"Content-Disposition":"attachment; filename=\"typeauthd-logs.log\""});
        res.send(atob(data.b64));
    }
}