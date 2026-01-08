/**
 * Environment configuration
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file - ignore if not found (environment variables might be provided elsewhere)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Environment configuration object
 */
export const config = {
  encora: {
    apiKey: process.env.ENCORA_API_KEY || '',
  },
  stagemedia: {
    apiKey: process.env.STAGEMEDIA_API_KEY || '',
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  formatting: {
    titleFormat: process.env.TITLE_FORMAT || '{{show}} {{tour}} | ({{date}}) {{master}}',
    dateReplaceChar: process.env.DATE_REPLACE_CHAR || 'x',
  },
  plex: {
    libraryBasePath: process.env.PLEX_LIBRARY_BASE_PATH || '',
  },
};

/**
 * Validates that required environment variables are set
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.encora.apiKey) {
    errors.push('ENCORA_API_KEY is not set');
  }
  if (!config.stagemedia.apiKey) {
    errors.push('STAGEMEDIA_API_KEY is not set');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}\n\n` +
      'Please ensure these are provided via .env file or environment variables.'
    );
  }

  // Log configuration status (avoiding leaking secrets)
  console.log('Configuration validated:');
  console.log(`- ENCORA_API_KEY: ${config.encora.apiKey ? 'Set (masked)' : 'NOT SET'}`);
  console.log(`- STAGEMEDIA_API_KEY: ${config.stagemedia.apiKey ? 'Set (masked)' : 'NOT SET'}`);
  console.log(`- Port: ${config.server.port}`);
}
