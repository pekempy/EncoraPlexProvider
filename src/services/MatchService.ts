/**
 * Match Service - Handles matching requests for TV shows, seasons, and episodes
 * See: docs/API Endpoints.md - Match Feature
 */

import { EncoraService } from './EncoraService';
import { MetadataResponse } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { FileSystemService } from './FileSystemService';
import { NfoService } from './NfoService';
import { config } from '../config/env';
import path from 'path';


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
  private fileSystemService: FileSystemService;
  private nfoService: NfoService;

  constructor(apiKey: string) {
    this.encoraService = new EncoraService(apiKey);
    this.fileSystemService = new FileSystemService();
    this.nfoService = new NfoService();
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

    let skipEncora = false;
    const nePattern = /{[Nn][Ee]}/;

    if (request.title && nePattern.test(request.title)) {
        console.log(`Found {ne} tag in title: "${request.title}". Skipping Encora search.`);
        skipEncora = true;
    } else if (request.filename && nePattern.test(request.filename)) {
        console.log(`Found {ne} tag in filename: "${request.filename}". Skipping Encora search.`);
        skipEncora = true;
    }

    if (idToMatch && !skipEncora) {
      const encoraResult = await this.encoraService.matchRecording(idToMatch);

      // If Encora returns results, use them
      if (encoraResult.MediaContainer.size > 0) {
        return encoraResult;
      }

      console.log(`No Encora results found for ID ${idToMatch}`);
    }

    // Fallback: If no GUID or we can't parse it, try title search
    if (request.title && !skipEncora) {
      console.log(`Searching via EncoraService for: "${request.title}"`);
      const searchResult = await this.encoraService.search(request.title);

      // If search returns results, use them
      if (searchResult.MediaContainer.size > 0) {
        return searchResult;
      }

      console.log(`No Encora search results found for "${request.title}"`);
    }

    console.log(`Checking NFO Fallback: filename=${request.filename}, libraryBasePath=${config.plex.libraryBasePath}`);

    // Fallback 2: Check for local NFO file if filename is provided
    if (request.filename && config.plex.libraryBasePath) {
      const fullPath = path.join(config.plex.libraryBasePath, request.filename);
      console.log(`Checking for NFO fallback for: ${fullPath}`);
      
      const nfoPath = this.fileSystemService.findNfoFile(fullPath);
      if (nfoPath) {
        console.log(`Found NFO fallback: ${nfoPath}`);
        const nfoMetadata = this.nfoService.parseMovieNfo(nfoPath);
        
        if (nfoMetadata) {
          return {
            MediaContainer: {
              offset: 0,
              totalSize: 1,
              identifier: MOVIE_PROVIDER_IDENTIFIER,
              size: 1,
              Metadata: [nfoMetadata],
            },
          };
        }
      }
    }

    console.log('No matches found via Encora or NFO. Returning empty results.');
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
