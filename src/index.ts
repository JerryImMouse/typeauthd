import { WebApp } from "./web/app";
import { Database } from "./database/generic";
import { Logger } from "./logging";
import { createServer, getSignalHandler } from "./helpers";
import { Configration } from "./config";

Database.getDbImpl().init(); // initialize database instance
const config = Configration.get();

const app = new WebApp();

app.configure();
app.controllers();
app.middlewares();

const server = createServer(config.app_https_useSSL(), app.application());

process.once("SIGTERM", getSignalHandler('SIGTERM', server));
process.once("SIGINT", getSignalHandler('SIGINT', server));

server.listen(config.port(), () => {
    Logger.get().info(`${(config.app_https_useSSL() ? 'Secure server' : 'Server')} started at ${config.port()}`);
})