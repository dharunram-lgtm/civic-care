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

app.use(express.static(path.join(__dirname, '..', 'frontend')));

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
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-care';
const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true' || !process.env.MONGODB_URI;

const http = require('http');
const WebSocket = require('ws');

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

app.set('wss', wss);

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log('[+] WebSocket client connected');
  ws.on('close', () => console.log('[-] WebSocket client disconnected'));
});

async function seedMockData(User, Department, Complaint) {
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('123456', salt);

  // 1. Seed Citizens
  const citizens = [
    { name: 'Rohan Sharma', email: 'rohan@civic.com', passwordHash, role: 'CITIZEN' },
    { name: 'Aarav Patel', email: 'aarav@civic.com', passwordHash, role: 'CITIZEN' }
  ];
  for (const c of citizens) {
    await User.findOneAndUpdate({ email: c.email }, c, { upsert: true });
  }

  // Find departments
  const sanitation = await Department.findOne({ name: 'Sanitation Department' });
  const roads = await Department.findOne({ name: 'Roads Department' });
  const electricity = await Department.findOne({ name: 'Electricity Department' });

  // 2. Seed Officers & update Department's officers list
  const officers = [
    { name: 'Officer Sanjay', email: 'sanjay@off.com', passwordHash, role: 'FIELD_OFFICER', departmentId: sanitation?._id },
    { name: 'Officer Rajesh', email: 'rajesh@off.com', passwordHash, role: 'FIELD_OFFICER', departmentId: roads?._id },
    { name: 'Officer Amit', email: 'amit@off.com', passwordHash, role: 'FIELD_OFFICER', departmentId: electricity?._id }
  ];

  for (const o of officers) {
    const user = await User.findOneAndUpdate({ email: o.email }, o, { upsert: true, new: true });
    if (o.departmentId) {
      await Department.findByIdAndUpdate(o.departmentId, { $addToSet: { officers: user._id } });
    }
  }

  // 3. Seed Department Heads
  const heads = [
    { name: 'Director Sharma', email: 'sharma@head.com', passwordHash, role: 'DEPT_HEAD', departmentId: sanitation?._id },
    { name: 'Director Verma', email: 'verma@head.com', passwordHash, role: 'DEPT_HEAD', departmentId: roads?._id }
  ];
  for (const h of heads) {
    await User.findOneAndUpdate({ email: h.email }, h, { upsert: true });
  }

  // 4. Seed Complaints
  const citizenUser = await User.findOne({ email: 'rohan@civic.com' });
  const officerUser = await User.findOne({ email: 'sanjay@off.com' });

  const complaintsCount = await Complaint.countDocuments();
  if (complaintsCount === 0 && citizenUser) {
    await Complaint.create([
      {
        title: 'Garbage Overflow near Market',
        description: 'Huge garbage pile overflowing on the street. It is causing bad smell and blocking the sidewalk.',
        imageUrl: '/assets/mock-garbage.jpg',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] },
        aiCategory: 'Garbage',
        aiConfidenceScore: 92,
        priority: 'HIGH',
        status: 'ACCEPTED',
        citizenId: citizenUser._id,
        departmentId: sanitation?._id,
        assignedOfficerId: officerUser?._id
      },
      {
        title: 'Dangerous Pothole on Main Road',
        description: 'Large and deep pothole in the middle of the lanes. Extremely dangerous for two-wheelers, especially at night.',
        imageUrl: '/assets/mock-pothole.jpg',
        location: { type: 'Point', coordinates: [77.2180, 28.6250] },
        aiCategory: 'Pothole',
        aiConfidenceScore: 95,
        priority: 'CRITICAL',
        status: 'ROUTED',
        citizenId: citizenUser._id,
        departmentId: roads?._id
      },
      {
        title: 'Broken Streetlight',
        description: 'Streetlight not working for the past week, making the lane completely dark and unsafe.',
        imageUrl: '/assets/mock-streetlight.jpg',
        location: { type: 'Point', coordinates: [77.1950, 28.6010] },
        aiCategory: 'Streetlight',
        aiConfidenceScore: 89,
        priority: 'MEDIUM',
        status: 'PENDING_ADMIN_REVIEW',
        citizenId: citizenUser._id,
        departmentId: electricity?._id
      }
    ]);
    console.log('[+] Mock complaints seeded');
  }
}

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

    const Department = require('../database/models/Department');
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

    const User = require('../database/models/User');
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

    // Auto-seed mock data for in-memory DB or empty DB
    const Complaint = require('../database/models/Complaint');
    await seedMockData(User, Department, Complaint);

    server.listen(PORT, () => {
      console.log(`[+] CIVIC CARE server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[-] Failed to start database:', err.message);
    console.log('[!] Starting server without database - API routes will return errors');

    app.use('/api', (req, res) => {
      res.status(503).json({ error: 'Database not available. Start MongoDB or set USE_MEMORY_DB=true' });
    });

    server.listen(PORT, () => {
      console.log(`[!] CIVIC CARE running on http://localhost:${PORT} (no DB)`);
    });
  }
}

start();

module.exports = { app, server };
