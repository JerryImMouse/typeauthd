import express from 'express';

// controllers
import { AuthController } from "./controllers/auth";
import { ApiController } from "./controllers/api";
import { RootController } from './controllers/root';
import { AdminController } from './controllers/admin';

import path from "path";
import http2Express from "http2-express-bridge";
import cookieParser from 'cookie-parser';

// erghh...
export class WebApp {
    private _express: express.Application;

    constructor() {
        this._express = http2Express(express);
    }

    configure(trustProxy: boolean = false) {
        this._express.set('views', path.resolve(__dirname, '..', '..', 'views'));
        this._express.set('view engine', 'pug');
        this._express.set('trust proxy', trustProxy);
    }

    middlewares() {
        this._express.use(cookieParser());
        this._express.use(express.urlencoded({extended: true}));
        this._express.use(express.static(path.resolve(__dirname, '..', '..', 'assets')));
    }

    controllers() {
        this._express.use(express.urlencoded({ extended: true }));
        this._express.use('/', RootController.collectToRouter());
        this._express.use('/api', ApiController.collectToRouter());
        this._express.use('/auth', AuthController.collectToRouter());
        this._express.use('/admin', AdminController.collectToRouter());
    }

    application() {
        return this._express;
    }
}