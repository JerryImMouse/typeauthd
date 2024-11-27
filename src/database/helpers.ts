import { eabort } from "../helpers";
import { IAuthorizedRecordSearchOptions, IRecordExtraSearchOptions } from "../types/database";

const recordKeys = ['id', 'uid', 'discord_uid'] as const;
const extraKeys = ['id', 'record_id'] as const;

export function getValidRecordSearchOpt(opt: IAuthorizedRecordSearchOptions): keyof IAuthorizedRecordSearchOptions {
    const definedKeys = recordKeys.filter(key => opt[key] !== undefined);

    if (definedKeys.length !== 1) {
        eabort('Failed to validate database search options.', opt);
    }

    return definedKeys[0];
}

export function getValidRecordExtraSearchOpt(opt: IRecordExtraSearchOptions): keyof IRecordExtraSearchOptions {
    const definedKeys = extraKeys.filter(key => opt[key] !== undefined);

    if (definedKeys.length !== 1) {
        eabort('Failed to validate database search options.', opt);
    }

    return definedKeys[0];
}