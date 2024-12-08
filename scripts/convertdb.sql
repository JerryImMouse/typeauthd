-- Converts old ssj_auth database to a new typeauthd database scheme.

-- !IMPORTANT!
-- ssj_auth database was incomplete, so it doesn't contain `expires` field, due to this issue, 
-- this query will set `expires` field to 0, so typeauthd will have to refresh every found token, its the only solution(I found) of this problem.

CREATE TABLE IF NOT EXISTS "authorized_records" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "uid" TEXT NOT NULL UNIQUE,
    "discord_uid" TEXT NOT NULL UNIQUE,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires" INTEGER NOT NULL,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "records_extra"
(
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	record_id INTEGER NOT NULL UNIQUE,
	json TEXT NOT NULL,
	FOREIGN KEY (record_id) REFERENCES "authorized_records"(id) ON DELETE CASCADE
);

-- Import authorized_records, expires field will be set to 0 as default so typeauthd will refresh each token
INSERT INTO authorized_records (uid, discord_uid, access_token, refresh_token, expires, updated_at)
SELECT ss14_userid, discord_id, access_token, refresh_token, 0, CURRENT_TIMESTAMP
FROM users;

-- Import given table, transform `is_given` to json object `loadout_given: <is_given>`
INSERT INTO records_extra (record_id, json)
SELECT 
    ar.id, 
    json_object('loadout_given', g.is_given) AS json
FROM 
    given g
JOIN 
    authorized_records ar
    ON ar.discord_uid = g.discord_id
WHERE 
    g.is_given IN (0, 1);