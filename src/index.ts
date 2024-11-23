import { WebApp } from "./web/app";
import { Database } from "./database/generic";
import { Logger } from "./logging";
import { getSignalHandler } from "./helpers";

Database.getDbImpl().init(); // initialize database instance

const app = new WebApp();

app.controllers();
app.middlewares();

const server = app.listen(() => {
    Logger.get().info("Server started!!!");
})

process.once("SIGTERM", getSignalHandler('SIGTERM', server));
process.once("SIGINT", getSignalHandler('SIGINT', server));