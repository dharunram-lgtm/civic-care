const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const departmentRoutes = require('./routes/departments');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/departments', departmentRoutes);

app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    service: 'CIVIC CARE API',
    version: '1.0.0',
    database: states[dbState] || 'unknown'
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-care';
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' || !process.env.MONGODB_URI;

async function start() {
  try {
    if (USE_MEMORY_DB) {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('[+] In-memory MongoDB started');
    } else {
      await mongoose.connect(MONGODB_URI);
      console.log('[+] MongoDB connected successfully');
    }

    const Department = require('./models/Department');
    const deptCount = await Department.countDocuments();
    if (deptCount === 0) {
      await Department.insertMany([
        { name: 'Sanitation Department' },
        { name: 'Roads Department' },
        { name: 'Municipality Department' },
        { name: 'Electricity Department' },
        { name: 'Traffic Police Department' },
        { name: 'Municipal Corporation' },
        { name: 'Parks & Horticulture Department' }
      ]);
      console.log('[+] Default departments seeded');
    }

    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const adminEmail = 'dharun@admin.com';
    const adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('123456', salt);
      await User.create({
        name: 'Admin Dharun',
        email: adminEmail,
        passwordHash,
        role: 'ADMIN'
      });
      console.log('[+] Admin account created: dharun@admin.com');
    }

    app.listen(PORT, () => {
      console.log(`[+] CIVIC CARE server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[-] Failed to start database:', err.message);
    console.log('[!] Starting server without database - API routes will return errors');

    app.use('/api', (req, res) => {
      res.status(503).json({ error: 'Database not available. Start MongoDB or set USE_MEMORY_DB=true' });
    });

    app.listen(PORT, () => {
      console.log(`[!] CIVIC CARE running on http://localhost:${PORT} (no DB)`);
    });
  }
}

start();
