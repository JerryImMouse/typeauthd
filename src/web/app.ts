import express, { Router } from 'express';
import { Configration } from '../config';

// controllers
import { AuthController } from "./controllers/auth";
import { ApiController } from "./controllers/api";
import { RootController } from './controllers/root';
import { AdminController } from './controllers/admin';

import path from "path";
import http2Express from "http2-express-bridge";
import cookieParser from 'cookie-parser';
import { logRequest } from './middlewares/base';

// erghh...
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
    }

    application() {
        return this._express;
    }
}