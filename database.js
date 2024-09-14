import Database from 'better-sqlite3';

const dbFilePath = '/rw/database/music.db'; // Update the path to the mounted volume



const db = new Database(dbFilePath);

function setupDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS songs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            artist TEXT NOT NULL,
            path TEXT NOT NULL,
            played INTEGER DEFAULT 0,
            liked INTEGER DEFAULT 0
        )
    `);
    db.exec(`
        CREATE TABLE IF NOT EXISTS queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            song_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log(db);
    return db;
}

function getDb() {
    return db; // Return the database instance
}

export { setupDatabase, getDb };
