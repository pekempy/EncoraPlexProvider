/**
 * Match Service - Handles matching requests for TV shows, seasons, and episodes
 * See: docs/API Endpoints.md - Match Feature
 */

import { EncoraService } from './EncoraService';
import { MetadataResponse } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';


/**
 * Match request body parameters
 */
export interface MatchRequest {
  type: number; // 2=show, 3=season, 4=episode
  title?: string;
  parentTitle?: string; // For seasons
  grandparentTitle?: string; // For episodes
  year?: number;
  guid?: string; // External ID (e.g., "tvdb://12345")
  index?: number; // Season number or episode number
  parentIndex?: number; // Season number for episodes
  date?: string; // Air date for episode matching (YYYY-MM-DD format)
  filename?: string;
  manual?: number; // 0 or 1
  includeAdult?: number; // 0 or 1
  includeChildren?: number; // 0 or 1
  episodeOrder?: string; // Episode group ID for alternative ordering
}

/**
 * Match service options
 */
export interface MatchServiceOptions {
  language?: string;
  country?: string;
}

export class MatchService {
  private encoraService: EncoraService;
  constructor(apiKey: string) {
    this.encoraService = new EncoraService(apiKey);
  }

  /**
   * Main match handler
   */
  async match(
    request: MatchRequest,
    options: MatchServiceOptions = {}
  ): Promise<MetadataResponse> {
    console.log('Match request received:', JSON.stringify(request, null, 2));

    let idToMatch: number | null = null;

    // Check if we have a specific GUID to match
    if (request.guid) {
      // Simple parsing for now, assuming encora://ID or just ID
      // If guid is like "encora://123", extract 123
      const match = request.guid.match(/encora:\/\/(\d+)/) || request.guid.match(/(\d+)/);
      if (match) {
        idToMatch = parseInt(match[1], 10);
      }
    }

    // Check for ID in title or filename (e.g. {e-12345} or {E 12345})
    if (!idToMatch) {
      const pattern = /{[Ee][\s-]?(\d+)}/;

      // Check title
      if (request.title) {
        const titleMatch = request.title.match(pattern);
        if (titleMatch) {
          idToMatch = parseInt(titleMatch[1], 10);
          console.log(`Found ID ${idToMatch} in title: "${request.title}"`);
        }
      }

      // Check filename if not found in title
      if (!idToMatch && request.filename) {
        const filenameMatch = request.filename.match(pattern);
        if (filenameMatch) {
          idToMatch = parseInt(filenameMatch[1], 10);
          console.log(`Found ID ${idToMatch} in filename: "${request.filename}"`);
        }
      }
    }

    // Fallback: Check if title is numeric (user entered ID in title field)
    if (!idToMatch && request.title && /^\d+$/.test(request.title)) {
      idToMatch = parseInt(request.title, 10);
      console.log(`Treating numeric title "${request.title}" as ID: ${idToMatch}`);
    }

    if (idToMatch) {
      const encoraResult = await this.encoraService.matchRecording(idToMatch);

      // If Encora returns results, use them
      if (encoraResult.MediaContainer.size > 0) {
        return encoraResult;
      }

      console.log(`No Encora results found for ID ${idToMatch}`);
    }

    // Fallback: If no GUID or we can't parse it, try title search
    if (request.title) {
      console.log(`Searching via EncoraService for: "${request.title}"`);
      const searchResult = await this.encoraService.search(request.title);

      // If search returns results, use them
      if (searchResult.MediaContainer.size > 0) {
        return searchResult;
      }

      console.log(`No Encora search results found for "${request.title}"`);
    }



    console.log('No matches found via Encora. Returning empty results.');
    return {
      MediaContainer: {
        offset: 0,
        totalSize: 0,
        identifier: MOVIE_PROVIDER_IDENTIFIER,
        size: 0,
        Metadata: [],
      },
    };
  }
}
