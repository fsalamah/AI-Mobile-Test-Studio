import request from 'supertest';
import { app } from '../../src/app.js';

describe('Express App', () => {
  describe('Health Check Endpoint', () => {
    it('should respond with status 200 and correct structure', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('API Documentation', () => {
    it('should serve Swagger UI', async () => {
      const response = await request(app).get('/api-docs/');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('swagger-ui');
      expect(response.text).toContain('Appium AI Backend Service API');
    });
  });

  describe('API Endpoints', () => {
    it('should return 404 for non-existent route', async () => {
      const response = await request(app).get('/api/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parse errors correctly', async () => {
      const response = await request(app)
        .post('/api/analysis/visual')
        .set('Content-Type', 'application/json')
        .send('{invalid json}');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toHaveProperty('message');
    });
  });
});