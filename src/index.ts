import { WebApp } from "./web/app";
import { Database } from "./database/generic";
import { Logger } from "./logging";
import { createServer, getSignalHandler } from "./helpers";
import { Configration } from "./config";
import { LocaleManager } from "./locale";

Database.getDbImpl().init(); // initialize database instance
const config = Configration.get();
const locales = LocaleManager.get();

logRuntimeInfo(config);

const app = new WebApp();

app.configure();
app.controllers();
app.middlewares();

const server = createServer(config.httpsUseSSL, app.application());

process.once("SIGTERM", getSignalHandler('SIGTERM', server));
process.once("SIGINT", getSignalHandler('SIGINT', server));

server.listen(config.port, () => {
    Logger.get().info(`Server is listening for incoming connections...`);
})

function logRuntimeInfo(config: Configration) {
    const logger = Logger.get();
    const nodeEnv = process.env.NODE_ENV || "Not Set";
    const dbProvider = config.databaseProvider;
    const nativeSSL = config.httpsUseSSL;

    logger.info(`Node environment: '${nodeEnv}'`);
    logger.info(`Database provider in use: '${dbProvider}'`);
    logger.info(`NativeSSL: ${nativeSSL}`);
    logger.info(`Running port: ${config.port}`);
    logger.info(`Locale in use: '${locales.locale}'`)
}