import {Request, Response, Router} from 'express';
import { WebHelpers } from '../helpers';

export class RootController {
    public static collectToRouter() {
        const router = Router();
        router.get('/', this.getRoot);
        return router;
    }

    public static async getRoot(req: Request, res: Response) {
        res.redirect('/auth/login');
    }
}