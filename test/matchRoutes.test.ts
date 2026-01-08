/**
 * Integration tests for Match routes
 * Note: These tests require ENCORA_API_KEY to be set in environment
 */

import request from 'supertest';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env ONLY if it exists (prevents wiping Docker env vars)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

import { createApp } from '../src/app';

// Skip tests if ENCORA_API_KEY is not set
const SKIP_TESTS = !process.env.ENCORA_API_KEY;

describe('Match Routes', () => {
  const app = createApp();

  if (SKIP_TESTS) {
    it.skip('skipping tests - ENCORA_API_KEY not set', () => { });
    return;
  }

  describe('POST /movie/library/metadata/matches', () => {
    it('should return 200 for valid match request by Encora ID in title', async () => {
      const response = await request(app)
        .post('/movie/library/metadata/matches')
        .send({
          type: 1,
          title: 'Wicked {e-12345}',
          year: 2024,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('MediaContainer');
      expect(response.body.MediaContainer.Metadata).toBeDefined();
    });

    it('should return 200 for valid match request by GUID', async () => {
      const response = await request(app)
        .post('/movie/library/metadata/matches')
        .send({
          type: 1,
          title: 'Some Show',
          guid: 'com.plexapp.agents.encora://15004?lang=en',
        });

      expect(response.status).toBe(200);
    });

    it('should search by specific ID if title is numeric', async () => {
      const response = await request(app)
        .post('/movie/library/metadata/matches')
        .send({
          type: 1,
          title: '15004',
          manual: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body.MediaContainer.size).toBeGreaterThan(0);
    });

    it('should return empty results for non-matching title', async () => {
      const response = await request(app)
        .post('/movie/library/metadata/matches')
        .send({
          type: 1,
          title: 'NonExistentShowWithVeryUniqueName12345',
        });

      expect(response.status).toBe(200);
      expect(response.body.MediaContainer.size).toBe(0);
    });
  });
});
