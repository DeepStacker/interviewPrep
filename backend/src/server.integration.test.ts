import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './server';

describe('server integration', () => {
  const expectReady = process.env.EXPECT_READY === 'true';

  it('responds healthy on /healthz', async () => {
    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('responds ready on /readyz when database is reachable', async () => {
    const response = await request(app).get('/readyz');

    if (expectReady) {
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ready');
      return;
    }

    expect([200, 503]).toContain(response.status);
    expect(['ready', 'not_ready']).toContain(response.body.status);
  });
});
