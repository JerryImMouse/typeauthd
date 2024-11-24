import { Configration } from "../config";
import { Logger } from "../logging";
import express, {Express} from 'express';
import http2, { Http2SecureServer } from 'http2';
import fs from 'fs';

// controllers
import { AuthController } from "./controllers/auth";
import { ApiController } from "./controllers/api";
import { Server } from "http";
import path from "path";
import { eabort, mapErr } from "../helpers";
import http2Express from "http2-express-bridge";

// erghh...
export class WebApp {
    private _config: Configration;
    private _logger: Logger;
    private _express: express.Application;

    private _port: number;

    constructor() {
        this._config = Configration.get();
        this._port = this._config.port();
        this._logger = Logger.get();
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
        this._express.use('/api', ApiController.collectToRouter());
        this._express.use('/auth', AuthController.collectToRouter());
    }

    application() {
        return this._express;
    }
}