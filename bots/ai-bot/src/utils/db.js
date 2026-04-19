import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db;

export async function initDB() {
    if (db) return db;
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            item TEXT NOT NULL,
            created_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS reminders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            remind_at INTEGER,
            channel_id TEXT
        );
        CREATE TABLE IF NOT EXISTS guild_settings (
            guild_id TEXT PRIMARY KEY,
            settings_json TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS guild_warnings (
            warning_key TEXT PRIMARY KEY,
            count INTEGER NOT NULL DEFAULT 0,
            history_json TEXT NOT NULL DEFAULT '[]'
        );
        CREATE TABLE IF NOT EXISTS guild_autoresponders (
            guild_id TEXT NOT NULL,
            trigger TEXT NOT NULL,
            response TEXT NOT NULL DEFAULT '',
            PRIMARY KEY (guild_id, trigger)
        );
        CREATE TABLE IF NOT EXISTS booster_roles (
            user_id TEXT PRIMARY KEY,
            role_id TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS afk (
            user_id TEXT PRIMARY KEY,
            reason TEXT NOT NULL DEFAULT '',
            since INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS cosmetics (
            user_id TEXT PRIMARY KEY,
            manual_title TEXT,
            auto_title TEXT
        );
        CREATE TABLE IF NOT EXISTS conversation_history (
            user_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            messages_json TEXT NOT NULL DEFAULT '[]',
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (user_id, guild_id)
        );
        CREATE TABLE IF NOT EXISTS invite_joins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            inviter_id TEXT,
            invite_code TEXT,
            joined_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_invite_joins_guild ON invite_joins (guild_id);
        CREATE INDEX IF NOT EXISTS idx_invite_joins_inviter ON invite_joins (guild_id, inviter_id);
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            action TEXT NOT NULL,
            target_id TEXT,
            executor_id TEXT,
            reason TEXT,
            changes_json TEXT,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_audit_log_target ON audit_log (guild_id, target_id);
        CREATE TABLE IF NOT EXISTS appeals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guild_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            reason TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            staff_id TEXT,
            created_at INTEGER NOT NULL,
            resolved_at INTEGER
        );
        CREATE TABLE IF NOT EXISTS dynamic_vcs (
            channel_id TEXT PRIMARY KEY,
            owner_id TEXT NOT NULL,
            guild_id TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
    `);
    console.log("✅ Database initialized");
    return db;
}

export async function getDB() {
    if (!db) await initDB();
    return db;
}
