/**
 * Environment configuration
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env file
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
};

/**
 * Validates that required environment variables are set
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!config.encora.apiKey) {
    errors.push('ENCORA_API_KEY is not set in .env file');
  }
  if (!config.stagemedia.apiKey) {
    errors.push('STAGEMEDIA_API_KEY is not set in .env file');
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
    );
  }
}
