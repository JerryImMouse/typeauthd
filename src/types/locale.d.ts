type LocaleEntries = {[locale: string]: string};

interface LocalesConfig {
    locales: LocaleEntries; // Represents key-value pairs where the key is the locale and the value is the file path
}

export interface Locale {
    [locale: string]: string
}

export interface LocalesContainer {
    [locale: string]: Locale
}