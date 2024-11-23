import { Configration } from "../config";
import { Logger } from "../logging";
import express, {Express} from 'express';

// controllers
import { AuthController } from "./controllers/auth";
import { ApiController } from "./controllers/api";

// erghh...
export class WebApp {
    private _config: Configration;
    private _logger: Logger;
    private _express: Express;

    private _port: number;

    constructor() {
        this._config = Configration.get();
        this._port = this._config.port();
        this._logger = Logger.get();
        this._express = express();
    }

    middlewares() {
        // somewhen you'll meet auth middleware here...
    }

    controllers() {
        this._express.use('/auth', AuthController.collectToRouter());
    }

    listen(cb: () => void) {
        this._express.listen(this._port, cb);
    }
}