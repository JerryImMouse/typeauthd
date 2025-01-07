import path from "node:path";
import { Configration } from "./config";
import { eabort, mapErr } from "./helpers";
import { Logger } from "./logging";
import { Locale, LocalesConfig, LocalesContainer } from './types/locale';
import fs from 'node:fs';

export class LocaleManager {
    private readonly _localesPath: string = path.join(__dirname, "../locales/");;
    private readonly _config: Configration = Configration.get();
    private readonly _logger: Logger = Logger.get();
    private _locales: LocalesContainer = {};

    private static _instance: LocaleManager;

    constructor() {
        this.loadLocale();
    }

    private loadLocale() {
        try {
            const data = fs.readFileSync(path.join(this._localesPath, "locales.json"), { encoding: 'utf-8' });
            const jsonData: LocalesConfig = JSON.parse(data);

            for (const [locale, filePath] of Object.entries(jsonData.locales)) {
                const localeData = fs.readFileSync(path.join(this._localesPath, filePath), { encoding: 'utf-8' });
                const localeJsonData: Locale = JSON.parse(localeData);
                this._locales[locale] = localeJsonData;
            }
        } catch (err) {
            if (err instanceof Error) {
                eabort('Error during locales setup.', mapErr(err));
            }
            eabort('Unknown error occurred during locales setup.');
        }
    }

    public loc(key: string, loc: string | undefined = undefined): string {
        const locale = this._locales[loc ?? this._config.locale];
        return locale?.[key] ?? key;
    }

    public get locale() {
        return this._config.locale;
    }

    public static get() {
        if (!LocaleManager._instance) {
            LocaleManager._instance = new LocaleManager();
        }

        return LocaleManager._instance;
    }
}