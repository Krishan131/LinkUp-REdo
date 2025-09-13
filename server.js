const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const cors = require('cors');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Define User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  bio: String,
  profile_image_url: String
});
const User = mongoose.model('User', userSchema);

// Define Purpose schema
const purposeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});
const Purpose = mongoose.model('Purpose', purposeSchema);

// Define Interest schema
const interestSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Purpose', required: true },
  created_at: { type: Date, default: Date.now }
});
const Interest = mongoose.model('Interest', interestSchema);

// Define SeenPurpose schema
const seenPurposeSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Purpose', required: true },
  created_at: { type: Date, default: Date.now }
});
const SeenPurpose = mongoose.model('SeenPurpose', seenPurposeSchema);

// Define FinalMatch schema
const finalMatchSchema = new mongoose.Schema({
  purpose_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Purpose', required: true },
  poster_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interested_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  accepted_by_interested_user: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now }
});
const FinalMatch = mongoose.model('FinalMatch', finalMatchSchema);

// Define Message schema
const messageSchema = new mongoose.Schema({
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

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

app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: 'Username and password are required.' });
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(409).json({ message: 'User already exists.' });
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
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
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid username or password.' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username or password.' });
        res.status(200).json({ message: 'Login successful!', user: { id: user._id.toString(), username: user.username } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/profile', upload.single('profileImage'), async (req, res) => {
    const { userId, bio, profile_image_url } = req.body;
    if (!userId) return res.status(401).json({ message: 'Unauthorized.' });

    let imageUrl = profile_image_url;
    if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
    }

    try {
        await User.findByIdAndUpdate(userId, { bio, profile_image_url: imageUrl });
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/profile/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'Profile not found.' });
        res.status(200).json({ user_id: user._id.toString(), bio: user.bio, profile_image_url: user.profile_image_url, username: user.username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.put('/api/profile/:userId', upload.single('profileImage'), async (req, res) => {
    const { userId } = req.params;
    const { bio, profile_image_url, username } = req.body;

    try {
        // Update username if provided
        if (username) {
            const existingUser = await User.findOne({ username, _id: { $ne: userId } });
            if (existingUser) return res.status(409).json({ message: 'Username already taken.' });
        }

        // Update profile
        let imageUrl = profile_image_url;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        await User.findByIdAndUpdate(userId, { username, bio, profile_image_url: imageUrl });
        res.status(200).json({ message: 'Profile updated successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/purpose/create', async (req, res) => {
  const { userId, title, description } = req.body;
  if (!userId) return res.status(401).json({ message: 'Unauthorized.' });
  if (!title || !description) return res.status(400).json({ message: 'Title and description are required.' });
  try {
    // Validate userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }
    const newPurpose = new Purpose({ user_id: userId, title, description });
    await newPurpose.save();
    res.status(201).json({ message: 'Purpose created successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.get('/api/purposes', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ message: 'User ID is required.' });
  try {
    // Get purpose IDs the user has swiped right or left on
    const interests = await Interest.find({ user_id: userId }).select('purpose_id');
    const seenPurposes = await SeenPurpose.find({ user_id: userId }).select('purpose_id');
    const excludedPurposeIds = [...interests.map(i => i.purpose_id.toString()), ...seenPurposes.map(s => s.purpose_id.toString())];

    // Find purposes excluding user's own and those swiped or seen
    const purposes = await Purpose.find({
      user_id: { $ne: userId },
      _id: { $nin: excludedPurposeIds }
    }).populate('user_id', 'username');

    // Map purposes to include username field
    const result = purposes.map(p => ({
      id: p._id.toString(),
      user_id: p.user_id._id.toString(),
      title: p.title,
      description: p.description,
      created_at: p.created_at,
      username: p.user_id.username
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error.' });
  }
});

app.post('/api/purpose/swipe-right', async (req, res) => {
    const { userId, purposeId } = req.body;
    if (!userId || !purposeId) return res.status(400).json({ message: 'User ID and Purpose ID are required.' });
    try {
        const existingInterest = await Interest.findOne({ user_id: userId, purpose_id: purposeId });
        if (existingInterest) return res.status(200).json({ message: 'You have already swiped right on this purpose.' });
        const newInterest = new Interest({ user_id: userId, purpose_id: purposeId });
        await newInterest.save();
        res.status(201).json({ message: 'Interest recorded successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/purpose/swipe-left', async (req, res) => {
    const { userId, purposeId } = req.body;
    if (!userId || !purposeId) return res.status(400).json({ message: 'User ID and Purpose ID are required.' });
    try {
        const existingRecord = await SeenPurpose.findOne({ user_id: userId, purpose_id: purposeId });
        if (existingRecord) return res.status(200).json({ message: 'You have already seen this purpose.' });
        const newSeen = new SeenPurpose({ user_id: userId, purpose_id: purposeId });
        await newSeen.save();
        res.status(201).json({ message: 'Purpose recorded as seen.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/my-purposes/interests', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });
    try {
        // Find interests where purpose.user_id == userId
        const interests = await Interest.find().populate({
            path: 'purpose_id',
            match: { user_id: userId }
        }).populate('user_id');
        // Filter out populated purposes that don't match
        const validInterests = interests.filter(i => i.purpose_id);
        // Exclude those already in final_matches
        const finalMatches = await FinalMatch.find({ purpose_id: { $in: validInterests.map(i => i.purpose_id._id) } }).select('interested_user_id purpose_id');
        const excluded = new Set(finalMatches.map(fm => `${fm.interested_user_id}-${fm.purpose_id}`));
        const filteredInterests = validInterests.filter(i => !excluded.has(`${i.user_id._id}-${i.purpose_id._id}`));
        // Map to response
        const result = filteredInterests.map(i => ({
            purpose_id: i.purpose_id._id.toString(),
            purpose_title: i.purpose_id.title,
            purpose_description: i.purpose_id.description,
            interested_user_id: i.user_id._id.toString(),
            interested_username: i.user_id.username,
            interested_user_bio: i.user_id.bio,
            interested_user_image: i.user_id.profile_image_url
        }));
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.post('/api/purpose/accept-interest', async (req, res) => {
    const { purposeId, posterId, interestedUserId } = req.body;
    if (!purposeId || !posterId || !interestedUserId) return res.status(400).json({ message: 'All required fields are missing.' });
    try {
        const existingMatch = await FinalMatch.findOne({ purpose_id: purposeId, interested_user_id: interestedUserId });
        if (existingMatch) return res.status(200).json({ message: 'Match already exists.' });
        const newMatch = new FinalMatch({ purpose_id: purposeId, poster_id: posterId, interested_user_id: interestedUserId });
        await newMatch.save();

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

app.post('/api/match/accept', async (req, res) => {
    const { purposeId, interestedUserId } = req.body;
    if (!purposeId || !interestedUserId) return res.status(400).json({ message: 'Purpose ID and Interested User ID are required.' });
    try {
        const result = await FinalMatch.findOneAndUpdate(
            { purpose_id: purposeId, interested_user_id: interestedUserId },
            { accepted_by_interested_user: true }
        );
        if (!result) {
            return res.status(404).json({ message: 'Match not found or already accepted.' });
        }
        res.status(200).json({ message: 'Match accepted successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/my-interests', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });
    try {
        const matches = await FinalMatch.find({ interested_user_id: userId, accepted_by_interested_user: false }).populate('purpose_id poster_id');
        const result = matches.map(m => ({
            purpose_id: m.purpose_id._id.toString(),
            purpose_title: m.purpose_id.title,
            purpose_description: m.purpose_id.description,
            poster_id: m.poster_id._id.toString(),
            poster_username: m.poster_id.username,
            poster_bio: m.poster_id.bio,
            poster_image: m.poster_id.profile_image_url
        }));
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/accepted-matches', async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'User ID is required.' });
    try {
        const matches = await FinalMatch.find({
            $or: [{ poster_id: userId }, { interested_user_id: userId }],
            accepted_by_interested_user: true
        }).populate('purpose_id poster_id interested_user_id');
        const result = matches.map(m => {
            const other = m.poster_id._id.toString() === userId ? m.interested_user_id : m.poster_id;
            return {
                purpose_id: m.purpose_id._id.toString(),
                purpose_title: m.purpose_id.title,
                purpose_description: m.purpose_id.description,
                poster_id: m.poster_id._id.toString(),
                interested_user_id: m.interested_user_id._id.toString(),
                other_username: other.username,
                other_bio: other.bio,
                other_image: other.profile_image_url,
                other_user_id: other._id.toString()
            };
        });
        res.status(200).json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error.' });
    }
});

app.get('/api/chat/history', async (req, res) => {
    const { user1Id, user2Id } = req.query;
    try {
        const messages = await Message.find({
            $or: [
                { sender_id: user1Id, receiver_id: user2Id },
                { sender_id: user2Id, receiver_id: user1Id }
            ]
        }).sort({ timestamp: 1 }).populate('sender_id', 'username');
        const result = messages.map(m => ({
            id: m._id.toString(),
            sender_id: m.sender_id._id.toString(),
            receiver_id: m.receiver_id.toString(),
            text: m.text,
            timestamp: m.timestamp,
            senderName: m.sender_id.username
        }));
        res.status(200).json(result);
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

    ws.on('message', async message => {
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

                const newMessage = new Message({ sender_id: senderId, receiver_id: receiverId, text });
                await newMessage.save();

                // Include sender's username in the message payload
                const senderUser = await User.findById(senderId);

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