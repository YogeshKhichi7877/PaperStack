
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
// const https = require('https');

require(`dotenv`).config();

// 1. IMPORT CLOUDINARY STORAGE
const { storage , cloudinary } = require('./cloudConfig'); 

// Import Models
const Paper = require('./models/Paper');
const User = require('./models/User'); 
const Comment = require('./models/Comment'); 

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'PaperStackSecretKey'; 

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // Increase to 2 mins
  max: 300, // Lower for testing, increase later
  standardHeaders: true,
  legacyHeaders: false,
});


// Put this at the bottom of index.js
// const backendUrl = "https://paperstack-backend.onrender.com"; // Your Render URL
// const backendUrl = 'https://paperstack-backend-7oeo.onrender.com'

// setInterval(() => {
//   https.get(backendUrl, (res) => {
//     console.log("Self-ping successful: Status", res.statusCode);
//   }).on('error', (err) => {
//     console.error("Self-ping failed:", err.message);
//   });
// }, 2 * 60 * 1000); // 2 minutes in milliseconds

// Middleware
// app.use(cors({
//     origin: ['https://paperstack-backend-7oeo.onrender.com',
//         "https://paper-stack-beryl.vercel.app",
//          "https://paper-stack-beryl.vercel.app/",  // Your live site
//     "http://localhost:5173",                 // Vite (Local)
//     "http://localhost:5000",
//     "http://localhost:3000",
//     "https://paperstack.onrender.com", // new render link
//     "https://paperstackcom.vercel.app/" , // new verseel url 
//      "https://paperstackcom.vercel.app" 
    
//     ], // For now, allow all. Later, replace with your Vercel URL for security.
//   methods: ["GET", "POST", "PUT", "PATCH" ,"DELETE"],
//   credentials: true
// }));

app.use(cors({
    origin: '*',  // Allow ANY domain
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true
}));

app.use(express.json());
app.use(helmet());
app.use('/api/', limiter);
app.use(compression());


// Database Connection
mongoose.connect('mongodb+srv://yogeshkhinchi2005_db_user:PaperStack%407877@paperstack.6vynuzi.mongodb.net/PaperStack')
    .then(() => console.log("✅ MongoDB atlas Connected"))
    .catch(err => console.log("❌ DB Error:", err));

// 2. INITIALIZE MULTER WITH CLOUDINARY STORAGE
// (We removed the 'diskStorage' code that was here before)
const upload = multer({ storage }); 

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: "Access Denied: No Token" });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        console.log("❌ Auth Failed:", err.message);
        res.status(400).json({ error: "Invalid Token" });
    }
};
app.get('/', (req, res) => {
    res.status(200).send('Server is healthy');
});
// 1. Auth
app.post('/api/auth/register', async (req, res) => {
    try {
        const saltrounds = 10
        // 1. Get semester from the request body
        const { username, email, password, semester } = req.body; 
        
        const existingUser = await User.findOne({ email }).lean();
        if (existingUser) return res.status(400).json({ error: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, saltrounds);

        // 2. Save semester to the database
        const user = new User({ 
            username, 
            email, 
            password: hashedPassword,
            semester: semester || 1 
        });

        await user.save();
        res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
        res.status(500).json({ error: "Registration failed" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).lean();
        if (!user) return res.status(400).json({ error: "User not found" });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign({ _id: user._id, username: user.username , semester: user.semester }, JWT_SECRET);
        res.json({ token, username: user.username, bookmarks: user.bookmarks, semester: user.semester });
    } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

app.post('/api/admin/verify', (req, res) => {
    const admin = process.env.admin_password;
    if(req.body.password === admin) {res.json({ success: true });
 } else {
    res.status(400).json({ success: false });
     redirect('/login')}
});

// 2. Paper Management (UPDATED FOR CLOUD)

// Route A: Single File Upload (Student/Standard)
app.post('/api/papers', upload.single('file'), async (req, res) => {
    try {
        // ✅ FIX 1: Safety check to prevent crash if upload fails
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded or invalid format" });
        }

        console.log("☁️ File Uploaded to Cloudinary:"); 

        const { title, subject, year, semester, examType } = req.body;

        const newPaper = new Paper({
            title,
            subject,
            year,
            semester,
            examType,
            filePath: req.file.path, 
            filePublicId: req.file.filename, 
            views: 0,
            downloads: 0
        });

        await newPaper.save();
        res.status(201).json(newPaper);

    } catch (err) {
        console.log("❌ Error Saving Paper:", err)
        console.error("Upload Error:", err);
        res.status(500).json({ error: "Upload failed" });
    }
});

// Route B: Admin Upload (File + Solution)
// Route B: Admin Upload (Updated to save Public IDs)
app.post('/api/upload', upload.fields([{ name: 'file' }, { name: 'solution' }]), async (req, res) => {
    
    const admin = process.env.admin_password;
    if(req.headers['x-admin-password'] !== admin) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        // ✅ Safety Check
        if (!req.files || !req.files['file']) {
            return res.status(400).json({ error: "No Question Paper file uploaded" });
        }

        const { title, subject, year, semester, examType } = req.body;

        // Extract File Info
        const paperFile = req.files['file'][0];
        const solutionFile = req.files['solution'] ? req.files['solution'][0] : null;

        const paper = new Paper({
            title, subject, year, semester, examType,
            
            filePath: paperFile.path, 
            filePublicId: paperFile.filename, 

            solutionPath: solutionFile ? solutionFile.path : null,
            solutionPublicId: solutionFile ? solutionFile.filename : null 
        });

        await paper.save();
        res.status(201).json(paper);
        console.log("☁️ Admin Upload Successful:", paper)

    } catch (err) {
        console.error("❌ Upload Error from /api/upload:", err);
        // res.status(500).json({ error: err.message });
    }
});

app.get('/api/papers', async (req, res) => {
    try {
        const papers = await Paper.find().sort({ year: -1, semester: 1 });
        console.log("papers from line 214  :")
        res.json(papers);
    } catch(err) { res.status(500).json({ error: "Fetch failed" }); }
});

// 3. Analytics & Views
app.post('/api/papers/:id/view', async (req, res) => {
    try {
        await Paper.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }).lean();
        res.status(200).json({ message: "View counted" });
    } catch (err) {
        console.error("❌ View Count Error:", err.message);
        res.status(500).json({ error: "Could not count view" });
    }
});

// --- NEW ROUTE: Track Downloads ---
app.post('/api/papers/:id/download', async (req, res) => {
    try {
        await Paper.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }).lean();
        res.status(200).json({ message: "Download counted" });
    } catch (err) {
        res.status(500).json({ error: "Error counting download" });
    }
});

app.get('/api/analytics', async (req, res) => {
    try {
        const stats = await Paper.aggregate([
            { $group: { _id: "$subject", totalViews: { $sum: "$views" } } },
            { $sort: { totalViews: -1 } },
            { $limit: 5 }
        ]).lean();
        res.json(stats);
    } catch (err) { res.status(500).json({ error: "Analytics failed" }); }
});

// 4. Comments
app.get('/api/papers/:id/comments', async (req, res) => {
    try {
        const comments = await Comment.find({ paperId: req.params.id }).sort({ createdAt: -1 }).lean();
        res.json(comments);
    } catch(err) { res.status(500).json({ error: "Fetch comments failed" }); }
});

app.post('/api/papers/:id/comments', authenticate, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: "Comment text required" });

        const newComment = new Comment({
            paperId: req.params.id,
            username: req.user.username,
            text
        });
        await newComment.save();
        res.json(newComment);
    } catch (err) {
        console.error("💥 Comment Save Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Bookmarks
app.put('/api/user/bookmark/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).lean();
        const index = user.bookmarks.indexOf(req.params.id);
        if(index === -1) user.bookmarks.push(req.params.id);
        else user.bookmarks.splice(index, 1);
        await user.save();
        res.json(user.bookmarks);
    } catch(err) { res.status(500).json({ error: "Bookmark failed" }); }
});

app.put('/api/user/semester', authenticate, async (req, res) => {
    try {
        const { semester } = req.body;
        // Update user in DB
        const user = await User.findByIdAndUpdate(
            req.user._id, 
            { semester: semester }, 
            { new: true } // Return updated doc
        ).lean();
        res.json({ message: "Semester updated", semester: user.semester });
    } catch (err) {
        res.status(500).json({ error: "Could not update semester" });
    }
});

// Use upload.fields to handle two separate file keys
app.put('/api/papers/:id/solution', upload.single('solution'), async (req, res) => {
    try {
        const paper = await Paper.findById(req.params.id).lean();
        if (!paper) return res.status(404).send("Paper not found");

        // Update with new Cloudinary solution data
        paper.solutionPath = req.file.path;
        paper.solutionPublicId = req.file.filename;
        
        await paper.save();
        res.json(paper);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/papers/:id', async (req, res) => {
    try {
        const admin = process.env.admin_password;
        // 1. Check Password
        if (req.headers['x-admin-password'] !== admin) { 
            return res.status(403).json({ message: "Invalid Admin Password" });
        }

        // 2. Find the paper first (so we can get the Public IDs)
        const paper = await Paper.findById(req.params.id).lean();
        console.log(paper)
        
        if (!paper) {
            return res.status(404).json({ message: "Paper not found" });
        }

        // 3. ✅ Delete Main Paper from Cloudinary
        if (paper.filePublicId) {
            await cloudinary.uploader.destroy(paper.filePublicId);
            console.log(`☁️ Deleted Cloudinary PDF: ${paper.filePublicId}`);
        }

        // 4. ✅ Delete Solution from Cloudinary (if exists)
        if (paper.solutionPublicId) {
            await cloudinary.uploader.destroy(paper.solutionPublicId);
            console.log(`☁️ Deleted Cloudinary Solution: ${paper.solutionPublicId}`);
        }

        // 5. Delete from Database
        await Paper.findByIdAndDelete(req.params.id);

        res.json({ message: "Paper and files deleted successfully" });
    } catch (err) {
        console.error("❌ Delete Error:", err);
        res.status(500).json({ error: err.message });
    }
});

//health check


app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date() });
});
app.listen(5000, () => console.log(`🚀 Server running on Port 5000`));