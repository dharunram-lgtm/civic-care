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
  res.json({ status: 'ok', service: 'CIVIC CARE API', version: '1.0.0' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-care';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('[+] MongoDB connected successfully');

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

    app.listen(PORT, () => {
      console.log(`[+] CIVIC CARE server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('[-] MongoDB connection error:', err.message);
    console.log('[!] Starting server without database - static files only');
    app.listen(PORT, () => {
      console.log(`[!] CIVIC CARE running on http://localhost:${PORT} (no DB)`);
    });
  });
