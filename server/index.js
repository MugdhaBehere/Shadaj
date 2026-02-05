import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Post from './models/Post.js';
import Notification from './models/Notification.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'shadaj_secret_key_change_this';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 media

// MongoDB Connection
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => console.log('Connected to MongoDB'))
      .catch((err) => console.error('MongoDB connection error:', err));
} else {
    console.log('MONGODB_URI not found in env. Running in offline mode (APIs will fail).');
}

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role, instrument } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      instrument,
      connections: [],
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      examinationLevel: '',
      interests: [],
      dob: ''
    });

    const token = jwt.sign({ email: newUser.email, id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ result: newUser, token });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (!existingUser) return res.status(404).json({ message: "User doesn't exist." });

    if (!existingUser.password) return res.status(400).json({ message: "Please sign in with your social account." });

    const isPasswordCorrect = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials." });

    const token = jwt.sign({ email: existingUser.email, id: existingUser._id, role: existingUser.role }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ result: existingUser, token });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong.' });
  }
});

// Google / OAuth Login (Backend Verification)
app.post('/api/auth/google', async (req, res) => {
    try {
        const { email, name, avatar, googleId } = req.body;
        
        let user = await User.findOne({ email });
        
        if (!user) {
            user = await User.create({
                email,
                name,
                avatar,
                oauthProvider: 'google',
                oauthId: googleId,
                role: 'student', // Default
                instrument: 'Vocal',
                connections: []
            });
        } else {
             // Update avatar if provided by Google
             if (avatar) {
                 user.avatar = avatar;
                 await user.save();
             }
        }

        const token = jwt.sign({ email: user.email, id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ result: user, token });
    } catch (error) {
        res.status(500).json({ message: 'Google Auth Failed' });
    }
});

// --- USER & CONNECTION ROUTES ---

// Get All Users (with basic filters)
app.get('/api/users', async (req, res) => {
    try {
        const { role, search } = req.query;
        let query = {};
        if (role) query.role = role;
        if (search) {
             query.$or = [
                 { name: { $regex: search, $options: 'i' } },
                 { instrument: { $regex: search, $options: 'i' } }
             ];
        }
        
        const users = await User.find(query).select('-password');
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// Update Profile
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // In a real app, verify req.user.id === id from JWT middleware
        
        const updatedUser = await User.findByIdAndUpdate(id, updates, { new: true }).select('-password');
        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile' });
    }
});

// Connect/Disconnect User
app.post('/api/users/:id/connect', async (req, res) => {
    try {
        const { currentUserId } = req.body;
        const targetUserId = req.params.id;

        const currentUser = await User.findById(currentUserId);
        
        if (!currentUser) return res.status(404).json({ message: 'User not found' });

        const index = currentUser.connections.indexOf(targetUserId);
        if (index === -1) {
            currentUser.connections.push(targetUserId); // Connect
        } else {
            currentUser.connections.splice(index, 1); // Disconnect
        }

        await currentUser.save();
        
        // Return updated user to update frontend state
        res.status(200).json(currentUser);
    } catch (error) {
        res.status(500).json({ message: 'Error updating connection' });
    }
});

// --- NOTIFICATION ROUTES ---

// Get Notifications for a user
app.get('/api/notifications', async (req, res) => {
    try {
        const { userId } = req.query;
        const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// Send Invite / Notification (Triggers Email)
app.post('/api/notifications/invite', async (req, res) => {
    try {
        const { recipients, title, message, link } = req.body; // recipients is array of userIds
        
        // 1. Create Notifications in DB
        const notifications = recipients.map(userId => ({
            userId,
            type: 'invite',
            title,
            message,
            link,
            isRead: false,
            createdAt: new Date()
        }));
        
        await Notification.insertMany(notifications);

        // 2. Simulate Sending Email
        // In a real app, use Nodemailer, SendGrid, or AWS SES here.
        recipients.forEach(async (userId) => {
             const user = await User.findById(userId); // Or find by email if userId is email
             if (user && user.email) {
                 console.log(`[EMAIL SERVICE] Sending email to ${user.email}`);
                 console.log(`Subject: ${title}`);
                 console.log(`Body: ${message}`);
                 console.log(`Link: ${link || 'N/A'}`);
                 console.log('------------------------------------------------');
             } else if (userId.includes('@')) {
                 // Fallback if userId acts as email (for local db mode)
                 console.log(`[EMAIL SERVICE] Sending email to ${userId}`);
                 console.log(`Subject: ${title}`);
                 console.log(`Body: ${message}`);
             }
        });

        res.status(200).json({ message: 'Invites sent successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error sending invites' });
    }
});

// Mark as Read
app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ message: 'Error updating notification' });
    }
});

// --- FEED ROUTES ---

// Get All Posts
app.get('/api/feed', async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 });
        res.status(200).json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching posts' });
    }
});

// Create Post
app.post('/api/feed', async (req, res) => {
    try {
        const newPost = await Post.create(req.body);
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: 'Error creating post' });
    }
});

// Delete Post
app.delete('/api/feed/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Post.findByIdAndDelete(id);
        res.status(200).json({ message: 'Post deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting post' });
    }
});

// Toggle Like
app.post('/api/feed/:id/like', async (req, res) => {
    try {
        const { userId } = req.body;
        const post = await Post.findById(req.params.id);
        
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const index = post.likedBy.indexOf(userId);
        if (index === -1) {
            post.likedBy.push(userId); // Like
        } else {
            post.likedBy.splice(index, 1); // Unlike
        }

        const updatedPost = await Post.findByIdAndUpdate(req.params.id, post, { new: true });
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Error liking post' });
    }
});

// Add Comment
app.post('/api/feed/:id/comment', async (req, res) => {
    try {
        const { comment } = req.body; // Expect full comment object
        const post = await Post.findById(req.params.id);
        
        if (!post) return res.status(404).json({ message: 'Post not found' });

        post.comments.push(comment);
        const updatedPost = await Post.findByIdAndUpdate(req.params.id, post, { new: true });
        
        res.status(200).json(updatedPost);
    } catch (error) {
        res.status(500).json({ message: 'Error adding comment' });
    }
});

// --- SERVE STATIC FRONTEND ---
// Must be after API routes
app.use(express.static(path.join(__dirname, '../dist')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});