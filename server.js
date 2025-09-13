const express = require('express');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const cors = require('cors');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const db = new Database('database.db');

db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL);`);
db.exec(`CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY, bio TEXT, profile_image_url TEXT, FOREIGN KEY (user_id) REFERENCES users(id));`);
db.exec(`CREATE TABLE IF NOT EXISTS purposes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id));`);
db.exec(`CREATE TABLE IF NOT EXISTS interests (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, purpose_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (purpose_id) REFERENCES purposes(id));`);
db.exec(`CREATE TABLE IF NOT EXISTS seen_purposes (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, purpose_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (purpose_id) REFERENCES purposes(id));`);
db.exec(`CREATE TABLE IF NOT EXISTS final_matches (id INTEGER PRIMARY KEY AUTOINCREMENT, purpose_id INTEGER NOT NULL, poster_id INTEGER NOT NULL, interested_user_id INTEGER NOT NULL, accepted_by_interested_user BOOLEAN DEFAULT FALSE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (purpose_id) REFERENCES purposes(id), FOREIGN KEY (poster_id) REFERENCES users(id), FOREIGN KEY (interested_user_id) REFERENCES users(id));`);
// Add column if it doesn't exist (for existing databases)
try {
    db.exec(`ALTER TABLE final_matches ADD COLUMN accepted_by_interested_user BOOLEAN DEFAULT FALSE;`);
} catch (error) {
    // Column might already exist, ignore
}
db.exec(`CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER NOT NULL, receiver_id INTEGER NOT NULL, text TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (sender_id) REFERENCES users(id), FOREIGN KEY (receiver_id) REFERENCES users(id));`);

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    try {
        const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existingUser) return res.status(409).json({ message: 'User already exists.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        stmt.run(username, hashedPassword);
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) return res.status(400).json({ message: 'Invalid username or password.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username or password.' });
        res.status(200).json({ message: 'Login successful!', user: { id: user.id, username: user.username } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/profile', upload.single('profileImage'), (req, res) => {
    const { userId, bio, profile_image_url } = req.body;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    let imageUrl = profile_image_url;
    if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
    }

    try {
        const stmt = db.prepare('INSERT OR REPLACE INTO profiles (user_id, bio, profile_image_url) VALUES (?, ?, ?)');
        stmt.run(userId, bio, imageUrl);
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/profile/:userId', (req, res) => {
    const { userId } = req.params;
    try {
        const profile = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(userId);
        if (!profile) return res.status(404).json({ message: 'Profile not found.' });
        res.status(200).json({ ...profile, username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.put('/api/profile/:userId', upload.single('profileImage'), (req, res) => {
    const { userId } = req.params;
    const { bio, profile_image_url, username } = req.body;

    try {
        // Update username if provided
        if (username) {
            const existingUser = db.prepare('SELECT * FROM users WHERE username = ? AND id != ?').get(username, userId);
            if (existingUser) return res.status(409).json({ message: 'Username already taken.' });
            db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
        }

        // Update profile
        let imageUrl = profile_image_url;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const stmt = db.prepare('INSERT OR REPLACE INTO profiles (user_id, bio, profile_image_url) VALUES (?, ?, ?)');
        stmt.run(userId, bio, imageUrl);
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/purpose/create', (req, res) => {
  const { userId, title, description } = req.body;
  if (!userId) return res.status(401).json({ message: 'Unauthorized.' });
  if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
  try {
    const stmt = db.prepare('INSERT INTO purposes (user_id, title, description) VALUES (?, ?, ?)');
    stmt.run(userId, title, description);
    res.status(201).json({ message: 'Purpose created successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.get('/api/purposes', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });
    try {
        const purposes = db.prepare(`SELECT p.*, u.username FROM purposes p JOIN users u ON p.user_id = u.id WHERE p.user_id != ? AND p.id NOT IN (SELECT purpose_id FROM interests WHERE user_id = ?) AND p.id NOT IN (SELECT purpose_id FROM seen_purposes WHERE user_id = ?)`).all(userId, userId, userId);
        res.status(200).json(purposes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/purpose/swipe-right', (req, res) => {
    const { userId, purposeId } = req.body;
    if (!userId || !purposeId) return res.status(400).json({ message: 'User ID and Purpose ID are required.' });
    try {
        const existingInterest = db.prepare('SELECT * FROM interests WHERE user_id = ? AND purpose_id = ?').get(userId, purposeId);
        if (existingInterest) return res.status(200).json({ message: 'You have already swiped right on this purpose.' });
        const stmt = db.prepare('INSERT INTO interests (user_id, purpose_id) VALUES (?, ?)');
        stmt.run(userId, purposeId);
        res.status(201).json({ message: 'Interest recorded successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/purpose/swipe-left', (req, res) => {
    const { userId, purposeId } = req.body;
    if (!userId || !purposeId) return res.status(400).json({ message: 'User ID and Purpose ID are required.' });
    try {
        const existingRecord = db.prepare('SELECT * FROM seen_purposes WHERE user_id = ? AND purpose_id = ?').get(userId, purposeId);
        if (existingRecord) return res.status(200).json({ message: 'You have already seen this purpose.' });
        const stmt = db.prepare('INSERT INTO seen_purposes (user_id, purpose_id) VALUES (?, ?)');
        stmt.run(userId, purposeId);
        res.status(201).json({ message: 'Purpose recorded as seen.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/my-purposes/interests', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });
    try {
        const interests = db.prepare(`SELECT p.id AS purpose_id, p.title AS purpose_title, p.description AS purpose_description, i.user_id AS interested_user_id, u.username AS interested_username, pr.bio AS interested_user_bio, pr.profile_image_url AS interested_user_image FROM purposes p JOIN interests i ON p.id = i.purpose_id JOIN users u ON i.user_id = u.id JOIN profiles pr ON u.id = pr.user_id WHERE p.user_id = ? AND i.user_id NOT IN (SELECT interested_user_id FROM final_matches WHERE purpose_id = p.id)`).all(userId);
        res.status(200).json(interests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/purpose/accept-interest', (req, res) => {
    const { purposeId, posterId, interestedUserId } = req.body;
    if (!purposeId || !posterId || !interestedUserId) return res.status(400).json({ message: 'All required fields are missing.' });
    try {
        const existingMatch = db.prepare('SELECT * FROM final_matches WHERE purpose_id = ? AND interested_user_id = ?').get(purposeId, interestedUserId);
        if (existingMatch) return res.status(200).json({ message: 'Match already exists.' });
        const stmt = db.prepare('INSERT INTO final_matches (purpose_id, poster_id, interested_user_id) VALUES (?, ?, ?)');
        stmt.run(purposeId, posterId, interestedUserId);

        // Notify the interested user via WebSocket
        const interestedClient = connectedClients.get(interestedUserId.toString());
        if (interestedClient && interestedClient.readyState === WebSocket.OPEN) {
            interestedClient.send(JSON.stringify({
                type: 'notification',
                message: 'Someone accepted your interest! Check your matches.'
            }));
        }

        res.status(201).json({ message: 'Match successfully created!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/match/accept', (req, res) => {
    const { purposeId, interestedUserId } = req.body;
    if (!purposeId || !interestedUserId) return res.status(400).json({ message: 'Purpose ID and Interested User ID are required.' });
    try {
        const stmt = db.prepare('UPDATE final_matches SET accepted_by_interested_user = TRUE WHERE purpose_id = ? AND interested_user_id = ?');
        const result = stmt.run(purposeId, interestedUserId);
        if (result.changes === 0) {
            return res.status(404).json({ message: 'Match not found or already accepted.' });
        }
        res.status(200).json({ message: 'Match accepted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/my-interests', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });
    try {
        const interests = db.prepare(`SELECT fm.purpose_id, p.title AS purpose_title, p.description AS purpose_description, u.username AS poster_username, pr.bio AS poster_bio, pr.profile_image_url AS poster_image, fm.poster_id FROM final_matches fm JOIN purposes p ON fm.purpose_id = p.id JOIN users u ON fm.poster_id = u.id LEFT JOIN profiles pr ON u.id = pr.user_id WHERE fm.interested_user_id = ? AND fm.accepted_by_interested_user = FALSE`).all(userId);
        res.status(200).json(interests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/accepted-matches', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });
    try {
        const matches = db.prepare(`SELECT fm.purpose_id, p.title AS purpose_title, p.description AS purpose_description, CASE WHEN fm.poster_id = ? THEN iu.username ELSE u.username END AS other_username, CASE WHEN fm.poster_id = ? THEN ipr.bio ELSE pr.bio END AS other_bio, CASE WHEN fm.poster_id = ? THEN ipr.profile_image_url ELSE pr.profile_image_url END AS other_image, CASE WHEN fm.poster_id = ? THEN fm.interested_user_id ELSE fm.poster_id END AS other_user_id FROM final_matches fm JOIN purposes p ON fm.purpose_id = p.id JOIN users u ON fm.poster_id = u.id JOIN users iu ON fm.interested_user_id = iu.id LEFT JOIN profiles pr ON u.id = pr.user_id LEFT JOIN profiles ipr ON iu.id = ipr.user_id WHERE (fm.poster_id = ? OR fm.interested_user_id = ?) AND fm.accepted_by_interested_user = 1`).all(userId, userId, userId, userId, userId, userId);
        res.status(200).json(matches);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/chat/history', (req, res) => {
    const { user1Id, user2Id } = req.query;
    try {
        const messages = db.prepare(`SELECT m.*, u.username AS senderName FROM messages m JOIN users u ON m.sender_id = u.id WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?) ORDER BY m.timestamp ASC`).all(user1Id, user2Id, user2Id, user1Id);
        res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});



const server = app.listen(PORT, () => { console.log(`HTTP server is running on http://localhost:${PORT}`); });

const wss = new WebSocket.Server({ server });
const connectedClients = new Map();

wss.on('connection', ws => {
    console.log('Client connected to WebSocket.');

    ws.on('message', message => {
        try {
            const data = JSON.parse(message);
            
            // Handle chat messages
            if (data.type === 'auth') {
                const { userId } = data;
                ws.userId = userId;
                connectedClients.set(userId, ws);
                console.log(`User ${userId} authenticated via WebSocket.`);
            }
            
            if (data.type === 'chatMessage') {
                const { senderId, receiverId, text } = data;
                if (!senderId || !receiverId || !text) return;

                const stmt = db.prepare('INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)');
                stmt.run(senderId, receiverId, text);

                // Include sender's username in the message payload
                const senderUser = db.prepare('SELECT username FROM users WHERE id = ?').get(senderId);

                const messagePayload = JSON.stringify({
                    type: 'chatMessage',
                    senderId: senderId,
                    senderName: senderUser ? senderUser.username : 'Unknown',
                    text: text,
                    timestamp: new Date().toISOString()
                });

                const senderClient = connectedClients.get(senderId);
                const receiverClient = connectedClients.get(receiverId);

                if (senderClient && senderClient.readyState === WebSocket.OPEN) {
                    senderClient.send(messagePayload);
                }
                if (receiverClient && receiverClient.readyState === WebSocket.OPEN) {
                    receiverClient.send(messagePayload);
                }
            }
        } catch (error) {
            console.error('Failed to parse message or handle:', error);
        }
    });

    ws.on('close', () => {
        if (ws.userId) {
            connectedClients.delete(ws.userId);
            console.log(`User ${ws.userId} disconnected.`);
        } else {
            console.log('Unauthenticated client disconnected.');
        }
    });
});