import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';

describe('Authentication API', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        username: `testuser_${Date.now()}`,
        password: 'testpass123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User created successfully');
      expect(response.body.user).toHaveProperty('username', userData.username);
      expect(response.body.user).toHaveProperty('id');
    });

    it('should reject registration with invalid data', async () => {
      const invalidData = {
        username: '',
        password: '123' // Too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const userData = {
        username: `logintest_${Date.now()}`,
        password: 'testpass123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Then try to login
      const response = await request(app)
        .post('/api/auth/login')
        .send(userData)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.user).toHaveProperty('username', userData.username);
    });

    it('should reject login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'wrongpass'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Not authenticated');
    });
  });
});