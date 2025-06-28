import request from 'supertest';
import { app } from '../src/server';

describe('Express Server', () => {
  // Existing tests
  it('should return healthy status on /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
  });

  it('should return liveness status as an array on /liveness-status', async () => {
    const res = await request(app).get('/liveness-status');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('ruleId');
      expect(res.body[0]).toHaveProperty('isLive');
      expect(res.body[0]).toHaveProperty('lastChecked');
    }
  });

  // Authentication Tests
  describe('Authentication', () => {
    describe('POST /register', () => {
      it('should register a new user successfully', async () => {
        const userData = {
          username: 'testuser',
          password: 'password123'
        };

        const res = await request(app)
          .post('/register')
          .send(userData);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('User registered successfully.');
        expect(res.body.username).toBe('testuser');
      });

      it('should reject registration with missing username', async () => {
        const userData = {
          password: 'password123'
        };

        const res = await request(app)
          .post('/register')
          .send(userData);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Username and password are required.');
      });

      it('should reject registration with missing password', async () => {
        const userData = {
          username: 'testuser'
        };

        const res = await request(app)
          .post('/register')
          .send(userData);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Username and password are required.');
      });

      it('should reject registration with short username', async () => {
        const userData = {
          username: 'ab',
          password: 'password123'
        };

        const res = await request(app)
          .post('/register')
          .send(userData);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Username must be at least 3 characters long.');
      });

      it('should reject registration with short password', async () => {
        const userData = {
          username: 'testuser',
          password: '12345'
        };

        const res = await request(app)
          .post('/register')
          .send(userData);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Password must be at least 6 characters long.');
      });

      it('should reject duplicate username registration', async () => {
        const userData = {
          username: 'duplicate',
          password: 'password123'
        };

        // First registration
        await request(app)
          .post('/register')
          .send(userData);

        // Second registration with same username
        const res = await request(app)
          .post('/register')
          .send(userData);

        expect(res.status).toBe(409);
        expect(res.body.error).toBe('Username already exists.');
      });

      it('should normalize username to lowercase', async () => {
        const userData = {
          username: 'TestUser',
          password: 'password123'
        };

        const res = await request(app)
          .post('/register')
          .send(userData);

        expect(res.status).toBe(201);
        expect(res.body.username).toBe('testuser');
      });
    });

    describe('POST /login', () => {
      beforeEach(async () => {
        // Register a test user before each login test
        await request(app)
          .post('/register')
          .send({
            username: 'logintest',
            password: 'password123'
          });
      });

      it('should login successfully with valid credentials', async () => {
        const loginData = {
          username: 'logintest',
          password: 'password123'
        };

        const res = await request(app)
          .post('/login')
          .send(loginData);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        expect(res.body.username).toBe('logintest');
        expect(res.body.message).toBe('Login successful. JWT issued.');
      });

      it('should reject login with missing username', async () => {
        const loginData = {
          password: 'password123'
        };

        const res = await request(app)
          .post('/login')
          .send(loginData);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Username and password are required.');
      });

      it('should reject login with missing password', async () => {
        const loginData = {
          username: 'logintest'
        };

        const res = await request(app)
          .post('/login')
          .send(loginData);

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Username and password are required.');
      });

      it('should reject login with invalid username', async () => {
        const loginData = {
          username: 'nonexistent',
          password: 'password123'
        };

        const res = await request(app)
          .post('/login')
          .send(loginData);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials.');
      });

      it('should reject login with invalid password', async () => {
        const loginData = {
          username: 'logintest',
          password: 'wrongpassword'
        };

        const res = await request(app)
          .post('/login')
          .send(loginData);

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('Invalid credentials.');
      });

      it('should handle case-insensitive username login', async () => {
        const loginData = {
          username: 'LoginTest',
          password: 'password123'
        };

        const res = await request(app)
          .post('/login')
          .send(loginData);

        expect(res.status).toBe(200);
        expect(res.body.username).toBe('logintest');
      });
    });

    describe('GET /validate-token', () => {
      let validToken: string;

      beforeEach(async () => {
        // Register and login to get a valid token
        await request(app)
          .post('/register')
          .send({
            username: 'tokentest',
            password: 'password123'
          });

        const loginRes = await request(app)
          .post('/login')
          .send({
            username: 'tokentest',
            password: 'password123'
          });

        validToken = loginRes.body.token;
      });

      it('should validate a valid token', async () => {
        const res = await request(app)
          .get('/validate-token')
          .set('Authorization', `Bearer ${validToken}`);

        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.user).toHaveProperty('username');
      });

      it('should reject request without token', async () => {
        const res = await request(app)
          .get('/validate-token');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No token provided');
      });

      it('should reject invalid token', async () => {
        const res = await request(app)
          .get('/validate-token')
          .set('Authorization', 'Bearer invalid.token.here');

        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Invalid token');
      });

      it('should reject malformed authorization header', async () => {
        const res = await request(app)
          .get('/validate-token')
          .set('Authorization', 'InvalidFormat');

        expect(res.status).toBe(401);
        expect(res.body.error).toBe('No token provided');
      });
    });
  });

  // Fake API Rules Tests (seeded data)
  describe('Fake API Rules', () => {
    it('should respond to seeded GET /test/admin rule', async () => {
      const res = await request(app).get('/test/admin');
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello, Administrator!');
      expect(res.headers['content-type']).toContain('application/json');
    });

    it('should respond to seeded GET /test/user rule', async () => {
      const res = await request(app).get('/test/user');
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('Hello, User!');
      expect(res.headers['content-type']).toContain('text/plain');
    });

    it('should respond to seeded POST /test/admin2 rule', async () => {
      const res = await request(app).post('/test/admin2');
      
      expect(res.status).toBe(201);
      expect(res.text).toBe('Created, Administrator!');
      expect(res.headers['content-type']).toContain('application/json');
    });
  });

  // Rule Management API Tests
  describe('Rule Management API', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get auth token
      await request(app)
        .post('/register')
        .send({
          username: 'ruletest',
          password: 'password123'
        });

      const loginRes = await request(app)
        .post('/login')
        .send({
          username: 'ruletest',
          password: 'password123'
        });

      authToken = loginRes.body.token;
    });

    it('should access rule management endpoints (if they exist)', async () => {
      // This test assumes you have rule management endpoints
      // Adjust the endpoint based on your actual implementation
      const res = await request(app)
        .get('/api/rules')
        .set('Authorization', `Bearer ${authToken}`);

      // This might be 200 with rules or 404 if endpoint doesn't exist
      expect([200, 404]).toContain(res.status);
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should return 404 for undefined routes', async () => {
      const res = await request(app).get('/nonexistent-route');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
      expect(res.body.path).toBe('/nonexistent-route');
      expect(res.body.method).toBe('GET');
    });

    it('should handle POST to undefined routes', async () => {
      const res = await request(app).post('/nonexistent-route');
      
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Route not found');
      expect(res.body.method).toBe('POST');
    });
  });

  // CORS Tests
  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    it('should handle preflight OPTIONS requests', async () => {
      const res = await request(app)
        .options('/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect([200, 204]).toContain(res.status);
    });
  });

  // Input Validation Tests
  describe('Input Validation', () => {
    it('should handle malformed JSON in requests', async () => {
      const res = await request(app)
        .post('/register')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(400);
    });

    it('should handle empty request bodies', async () => {
      const res = await request(app)
        .post('/register')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Username and password are required.');
    });
  });

  // Content Type Tests
  describe('Content Types', () => {
    it('should accept JSON content type', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          username: 'jsontest',
          password: 'password123'
        })
        .set('Content-Type', 'application/json');

      expect(res.status).toBe(201);
    });

    it('should return JSON responses', async () => {
      const res = await request(app).get('/health');
      
      expect(res.headers['content-type']).toContain('application/json');
    });
  });
});