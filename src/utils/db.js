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
        CREATE TABLE IF NOT EXISTS reputation (
            user_id TEXT PRIMARY KEY,
            score INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL
        );
    `);
    console.log("✅ Database initialized");
    return db;
}

export async function getDB() {
    if (!db) await initDB();
    return db;
}
