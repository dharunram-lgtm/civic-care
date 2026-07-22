const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../database/models/User');
const Department = require('../database/models/Department');
const Complaint = require('../database/models/Complaint');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civic-care';

async function run() {
  try {
    console.log('[*] Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('[+] Connected');

    console.log('[*] Clearing existing database collections...');
    await User.deleteMany({});
    await Department.deleteMany({});
    await Complaint.deleteMany({});
    console.log('[+] Cleared');

    console.log('[*] Seeding departments...');
    const depts = await Department.insertMany([
      { name: 'Sanitation Department' },
      { name: 'Roads Department' },
      { name: 'Municipality Department' },
      { name: 'Electricity Department' },
      { name: 'Traffic Police Department' },
      { name: 'Municipal Corporation' },
      { name: 'Parks & Horticulture Department' }
    ]);
    console.log(`[+] Seeded ${depts.length} departments`);

    const sanitation = depts.find(d => d.name === 'Sanitation Department');
    const roads = depts.find(d => d.name === 'Roads Department');
    const electricity = depts.find(d => d.name === 'Electricity Department');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    console.log('[*] Seeding users...');
    // Seed admin
    const admin = await User.create({
      name: 'Admin Dharun',
      email: 'dharun@admin.com',
      passwordHash,
      role: 'ADMIN'
    });

    // Seed citizens
    const citizen1 = await User.create({
      name: 'Rohan Sharma',
      email: 'rohan@civic.com',
      passwordHash,
      role: 'CITIZEN'
    });

    const citizen2 = await User.create({
      name: 'Aarav Patel',
      email: 'aarav@civic.com',
      passwordHash,
      role: 'CITIZEN'
    });

    // Seed officers
    const officer1 = await User.create({
      name: 'Officer Sanjay',
      email: 'sanjay@off.com',
      passwordHash,
      role: 'FIELD_OFFICER',
      departmentId: sanitation._id
    });
    sanitation.officers.push(officer1._id);
    await sanitation.save();

    const officer2 = await User.create({
      name: 'Officer Rajesh',
      email: 'rajesh@off.com',
      passwordHash,
      role: 'FIELD_OFFICER',
      departmentId: roads._id
    });
    roads.officers.push(officer2._id);
    await roads.save();

    const officer3 = await User.create({
      name: 'Officer Amit',
      email: 'amit@off.com',
      passwordHash,
      role: 'FIELD_OFFICER',
      departmentId: electricity._id
    });
    electricity.officers.push(officer3._id);
    await electricity.save();

    // Seed heads
    const head1 = await User.create({
      name: 'Director Sharma',
      email: 'sharma@head.com',
      passwordHash,
      role: 'DEPT_HEAD',
      departmentId: sanitation._id
    });

    const head2 = await User.create({
      name: 'Director Verma',
      email: 'verma@head.com',
      passwordHash,
      role: 'DEPT_HEAD',
      departmentId: roads._id
    });

    console.log('[+] Users seeded successfully');

    console.log('[*] Seeding complaints...');
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
        citizenId: citizen1._id,
        departmentId: sanitation._id,
        assignedOfficerId: officer1._id
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
        citizenId: citizen1._id,
        departmentId: roads._id
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
        citizenId: citizen2._id,
        departmentId: electricity._id
      }
    ]);
    console.log('[+] Complaints seeded');
    console.log('[+] Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('[-] Seeding failed:', err.message);
    process.exit(1);
  }
}

run();
