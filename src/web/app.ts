import express, { NextFunction, Request, Response, Router } from 'express';
import { Configration } from '../config';
import { Logger } from '../logging';

// controllers
import { AuthController } from "./controllers/auth";
import { ApiController } from "./controllers/api";
import { RootController } from './controllers/root';
import { AdminController } from './controllers/admin';

import path from "path";
import http2Express from "http2-express-bridge";
import cookieParser from 'cookie-parser';
import { logRequest } from './middlewares/base';

export class WebApp {
    private _express: express.Application;
    private _pathBaseRouter: express.Router;
    private _config: Configration;


    constructor() {
        this._config = Configration.get();
        this._express = http2Express(express);
        this._pathBaseRouter = Router();
    }

    configure(trustProxy: boolean = false) {
        this._express.set('views', path.resolve(__dirname, '..', '..', 'views'));
        this._express.set('view engine', 'pug');
        this._express.set('trust proxy', trustProxy);
    }

    middlewares() {
        this._express.use(cookieParser());
        
        this._express.use(express.urlencoded({extended: true}));
        this._express.use(express.json());
        
        this._express.use(this._config.pathBase, express.static(path.resolve(__dirname, '..', '..', 'assets')));
        this._express.use(logRequest);
    }

    controllers() {
        this._pathBaseRouter.use(express.urlencoded({extended: true}));
        this._pathBaseRouter.use('/', RootController.collectToRouter());
        this._pathBaseRouter.use('/api', ApiController.collectToRouter());
        this._pathBaseRouter.use('/auth', AuthController.collectToRouter());
        this._pathBaseRouter.use('/admin', AdminController.collectToRouter());

        this._express.use(this._config.pathBase, this._pathBaseRouter);

        // Global error handler
        this._express.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
            const logger = Logger.get();
            logger.error('Unhandled error in request pipeline', {
                message: err.message,
                stack: err.stack,
                name: err.name,
            });
            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal Server Error' });
            }
        });
    }

    application() {
        return this._express;
    }
}
