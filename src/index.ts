import { WebApp } from "./web/app";
import { Database } from "./database/generic";
import { Logger } from "./logging";

Database.getDbImpl().init(); // initialize database instance

const app = new WebApp();

app.controllers();
app.middlewares();

app.listen(() => {
    Logger.get().info("Server started!!!");
})