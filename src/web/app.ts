import express from 'express';

// controllers
import { AuthController } from "./controllers/auth";
import { ApiController } from "./controllers/api";
import path from "path";
import http2Express from "http2-express-bridge";
import { RootController } from './controllers/root';
import { getLocale } from './middlewares/auth';

// erghh...
export class WebApp {
    private _express: express.Application;

    constructor() {
        this._express = http2Express(express);
    }

    configure() {
        this._express.set('views', path.resolve(__dirname, 'views'));
        this._express.set('view engine', 'pug');
    }

    middlewares() {
        this._express.use(express.static(path.resolve(__dirname, '..', '..', 'assets')));
    }

    controllers() {
        this._express.use(express.urlencoded({ extended: true }));
        this._express.use('/', RootController.collectToRouter());
        this._express.use('/api', ApiController.collectToRouter());
        this._express.use('/auth', AuthController.collectToRouter());
    }

    application() {
        return this._express;
    }
}