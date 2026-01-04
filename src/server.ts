/**
 * HTTP Server entry point
 */

import { createApp } from './app';
import { config, validateConfig } from './config/env';

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  console.error('Configuration error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

const app = createApp();

app.listen(config.server.port, () => {
  console.log(`Encora Plex Provider listening on port ${config.server.port}`);
  console.log(`Metadata Provider available at: http://localhost:${config.server.port}/movie`);
  console.log(`Match endpoint: http://localhost:${config.server.port}/movie/library/metadata/matches`);
  console.log(`API Documentation: http://localhost:${config.server.port}/api-docs`);
});
