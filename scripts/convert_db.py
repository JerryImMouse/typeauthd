"""
Converts old ssj_auth database to a new typeauthd database scheme.

!IMPORTANT!
ssj_auth database was incomplete, so it doesn't contain `expires` field, due to this issue, 
this query will set `expires` field to 0, so typeauthd will have to refresh every found token, its the only solution(I found) of this problem.
"""

import sqlite3
import sys
import os

authorized_records_table = """
CREATE TABLE IF NOT EXISTS "authorized_records" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
    "uid" TEXT NOT NULL UNIQUE,
    "discord_uid" TEXT NOT NULL UNIQUE,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "expires" INTEGER NOT NULL,
    "updated_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);
"""

records_extra_table = """
CREATE TABLE IF NOT EXISTS "records_extra" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL UNIQUE,
    json TEXT NOT NULL,
    FOREIGN KEY (record_id) REFERENCES "authorized_records"(id) ON DELETE CASCADE
);
"""

select_old_users_data = "SELECT ss14_userid, discord_id, access_token, refresh_token FROM users;"
insert_new_users_data = """
INSERT INTO authorized_records (uid, discord_uid, access_token, refresh_token, expires, updated_at)
VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP);
"""

select_old_given_data = "SELECT discord_id, is_given FROM given WHERE is_given IN (0, 1);"
select_given_users = "SELECT id FROM authorized_records WHERE discord_uid = ?;"
insert_new_given_data = """
INSERT INTO records_extra (record_id, json)
VALUES (?, ?);
"""

def convert_database(old_db_path, new_db_path):
    if not os.path.exists(old_db_path):
        print(f"Error: Old database file '{old_db_path}' does not exist.")
        sys.exit(1)

    old_conn = sqlite3.connect(old_db_path)
    new_conn = sqlite3.connect(new_db_path)

    try:
        old_cursor = old_conn.cursor()
        new_cursor = new_conn.cursor()

        new_cursor.execute(authorized_records_table)

        new_cursor.execute(records_extra_table)

        old_cursor.execute(select_old_users_data)
        users = old_cursor.fetchall()
        for user in users:
            uid, discord_uid, access_token, refresh_token = user
            new_cursor.execute(insert_new_users_data, (uid, discord_uid, access_token, refresh_token))

        old_cursor.execute(select_old_given_data)
        given_records = old_cursor.fetchall()
        for discord_id, is_given in given_records:
            new_cursor.execute(select_given_users, (discord_id,))
            record = new_cursor.fetchone()
            if record:
                record_id = record[0]
                json_data = f'{{"loadout_given": {is_given}}}'
                new_cursor.execute(insert_new_given_data, (record_id, json_data))

        new_conn.commit()
        print(f"Database conversion completed successfully! New database saved at '{new_db_path}'.")

    except sqlite3.Error as e:
        print(f"An error occurred during the conversion: {e}")
        new_conn.rollback()

    finally:
        old_conn.close()
        new_conn.close()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_db.py <old_database.db> <new_database.db>")
        sys.exit(1)

    old_db = sys.argv[1]
    new_db = sys.argv[2]
    convert_database(old_db, new_db)