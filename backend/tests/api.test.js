const request = require('supertest');
const mongoose = require('mongoose');
const { app, server } = require('../server');

describe('Civic Care API Integration Tests', () => {
  let token;
  let citizenToken;

  beforeAll(async () => {
    // Wait for the MongoMemoryServer connection to be established
    for (let i = 0; i < 20; i++) {
      if (mongoose.connection.readyState === 1) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  afterAll(async () => {
    // Gracefully clean up handles
    await new Promise(resolve => server.close(resolve));
    await mongoose.connection.close();
  });

  test('POST /api/auth/login - admin login success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dharun@admin.com',
        password: '123456'
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  test('POST /api/auth/login - invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'dharun@admin.com',
        password: 'wrongpassword'
      });
    expect(res.status).toBe(401);
  });

  test('POST /api/auth/register - citizen register success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Citizen',
        email: 'test@civic.com',
        password: 'password123'
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    citizenToken = res.body.token;
  });

  test('GET /api/complaints - retrieve complaints', async () => {
    const res = await request(app)
      .get('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('complaints');
    expect(Array.isArray(res.body.complaints)).toBe(true);
  });

  test('POST /api/complaints - create new complaint', async () => {
    const res = await request(app)
      .post('/api/complaints')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        description: 'Pothole on street 5 near the school',
        latitude: '28.6139',
        longitude: '77.2090'
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('complaint');
    expect(res.body.complaint.description).toBe('Pothole on street 5 near the school');
  });
});
