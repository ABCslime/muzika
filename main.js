import express from 'express';
import {Download} from './download.js';
import * as fs from "fs";
import cors from 'cors';
import { setupDatabase, getDb } from './database.js';

const downClinet = new Download();
const app = express();
const port = 3000;
let index = 0
const ids = ["2432e9ef-7f8e-42cc-99d5-ae9d15be93ab","7272a62a-8457-4f14-9300-be3ec5de4a9b","7795f422-6ec7-42f9-bf99-ce402b6c3ebd",
                    "210aa572-7107-41a6-b110-81afec1f5628","f9c7ac8a-52c8-4cb1-ae37-33472c2ca204","aa4ba3e1-194f-400b-b023-40c5091f7f5a",
                    "8997f23c-5475-48ef-9516-32bc1f8c3b0b","bb4f44c8-d2d3-436e-8861-8b0c66313e5d","6f31f278-8cc6-47e6-9492-18dc0b2ee624",
                    "5823b99c-2c5d-42b9-955d-7755502f0e46"]
let taskIndex = 0;
let lastOut
// Middleware to parse JSON bodies
app.use(cors({
    origin: true, // Allow all origins (for development only)
    methods: ['GET', 'POST'], // Specify allowed methods
    credentials: false // If you need to include credentials
}));
app.use(express.json());

let db = setupDatabase(); // Initialize the database

async function runTasksUntilSuccess(limit) {
    let ongoingTasks = {};
    let successCount = 0;
    while (successCount < limit) {
        while (Object.values(ongoingTasks).length < 2 && taskIndex < 10) { // maintain 5 concurrent tasks
            let random = await downClinet.findRandom()
            if (random != null){
                ongoingTasks[random.name] = downClinet.get(random, ids[taskIndex])
                taskIndex = (taskIndex+1)%10
            }

        }
        console.log(ongoingTasks)


        try{
            const result = await Promise.all(Object.values(ongoingTasks));
            console.log(result)
            return result

        }catch (e) {
            // Remove the faild task from ongoing tasks  array
            console.log("deleting: "+ e)

            for (const task in ongoingTasks){
                if (task===e){
                    delete ongoingTasks[task];
                }
            }
        }


    }


}

async function downloadSongs(db){
    
    let paths = await runTasksUntilSuccess(10)
    for (const path of paths){
        const insertSong = db.prepare('INSERT INTO songs (name, artist, path) VALUES (?, ?, ?)');
        const result = insertSong.run(path.name, path.artist, path.path);

        // Get the inserted ID
        const insertedId = result.lastInsertRowid; // This will give you the ID of the newly inserted row
        db.prepare('INSERT INTO queue (song_id) VALUES (?)').run(insertedId)
    }

}

app.get('/api/getLikedSongs', async (req, res) => {
    const getLikedSongs = db.prepare('SELECT * FROM songs WHERE liked = 1');
    const likedSongs = getLikedSongs.all();
    res.json(likedSongs);
});

app.get('/api/removeUnlikedSongs', async (req, res) => {
    //remove all songs that are not liked and were lisend to and delete them from file system

    const getUnlikedSongs = db.prepare('SELECT * FROM songs WHERE liked = 0 AND played = 1');
    const unlikedSongs = getUnlikedSongs.all();
    for (const song of unlikedSongs){
        try{
            fs.unlinkSync(song.path);
        }catch (e){
            console.log(e)
        }
    }
    const removeUnlikedSongs = db.prepare('DELETE FROM songs WHERE liked = 0 AND played = 1');
    removeUnlikedSongs.run();
    res.status(200).json({ message: 'Unliked songs removed' });
});

app.get('/api/getMetadata', async (req, res) => {
    index = index + 1;

    
    const getNextSong = db.prepare('SELECT * FROM queue ORDER BY id ASC LIMIT 1');

    const next_song_id = getNextSong.get(); 
    console.log(next_song_id);


    if (next_song_id == null) {
        downloadSongs(db)
        return res.status(404).json({ error: 'No songs available' });
    }
    const getSong = db.prepare('SELECT * FROM songs WHERE id = ?');
    const song = getSong.get(next_song_id.song_id)
    lastOut = song

    // Remove first song from queue
    db.prepare('DELETE FROM queue WHERE id = ?').run(next_song_id.id);

    //remuve first song from queue
    


    // Get song metadata
    const metadata = {
        id: lastOut.id, // You might have an ID system for your songs
        title: lastOut.name,
        artist: lastOut.artist, // Replace with actual metadata if available
    };

    // Return metadata as JSON
    res.json(metadata);

    //how many songs are in the queue
    const QueueLength = db.prepare('SELECT COUNT(*) FROM queue').get();
    console.log(QueueLength['COUNT(*)']); // Fixed variable name
    if (QueueLength['COUNT(*)'] < 10){
        downloadSongs(db)
    }



});

app.post('/api/likeSong', (req, res) => {
    const { song_id } = req.body;

    if (!song_id) {
        return res.status(400).json({ error: 'Song ID is required' });
    }

    // Update the song in the database to set it as liked
    const updateLikedStatus = db.prepare('UPDATE songs SET liked = 1 WHERE id = ?');
    const result = updateLikedStatus.run(song_id);

    if (result.changes > 0) {
        return res.status(200).json({ message: 'Song marked as liked' });
    } else {
        return res.status(404).json({ error: 'Song not found' });
    }
});

// New route to serve the specified file
app.get('/api/getSong/:song_id', (req, res) => {

    const song_id = req.params.song_id
    //load 
    const getSong = db.prepare('SELECT * FROM songs WHERE id = ?');
    const song = getSong.get(song_id).path

    const stat = fs.statSync(song);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (start >= fileSize || end >= fileSize) {
            res.status(416).send('Requested range not satisfiable\n' + start + '-' + end + '/' + fileSize);
            return;
        }

        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(song, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'audio/mpeg',
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'audio/mpeg',
        };
        res.writeHead(200, head);
        fs.createReadStream(song).pipe(res);
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
