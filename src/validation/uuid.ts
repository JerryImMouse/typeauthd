import { Configration } from "../config";

const config = Configration.get();
const regex = new RegExp(config.uuidRegExp);

export function validateUuid(uuid: string) {
    return regex.test(uuid);
}