import fs from 'fs';
import { XMLParser } from 'fast-xml-parser';
import { MovieMetadata } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';

export class NfoService {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });
  }

  /**
   * Parses an NFO file and returns MovieMetadata
   */
  public parseMovieNfo(filePath: string): MovieMetadata | null {
    try {
      if (!fs.existsSync(filePath)) return null;

      const xmlContent = fs.readFileSync(filePath, 'utf-8');
      const data = this.parser.parse(xmlContent);

      const movie = data.movie || data.details;
      if (!movie) return null;
      const safePath = Buffer.from(filePath).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const ratingKey = `local-nfo-${safePath}`;

      // Map NFO fields to MovieMetadata
      const metadata: MovieMetadata = {
        type: 'movie',
        ratingKey: ratingKey,
        guid: `tv.plex.agents.custom.encora://movie/${ratingKey}`,
        key: `/library/metadata/${ratingKey}`,
        title: movie.title || movie.originaltitle || 'Unknown Title',
        originallyAvailableAt: movie.premiered || movie.aired || movie.releasedate || '',
        year: parseInt(movie.year, 10) || undefined,
        summary: movie.plot || movie.outline || '',
        studio: movie.studio || '',
        tagline: movie.tagline || '',
        Genre: this.mapTags(movie.genre),
        Director: this.mapTags(movie.director),
        Writer: this.mapTags(movie.credits),
        Role: this.mapActors(movie.actor),
      };

      // Clean up empty fields
      if (!metadata.originallyAvailableAt && metadata.year) {
        metadata.originallyAvailableAt = `${metadata.year}-01-01`;
      }

      return metadata;
    } catch (err) {
      console.error('Error parsing NFO:', err);
      return null;
    }
  }

  private mapTags(value: any): { tag: string }[] | undefined {
    if (!value) return undefined;
    if (Array.isArray(value)) {
      return value.map(v => ({ tag: String(v) }));
    }
    if (typeof value === 'string') {
      return value.split(' / ').map(v => ({ tag: v.trim() }));
    }
    return [{ tag: String(value) }];
  }

  private mapActors(value: any): any[] | undefined {
    if (!value) return undefined;
    const actors = Array.isArray(value) ? value : [value];
    return actors.map(a => ({
      tag: a.name || 'Unknown',
      role: a.role || '',
      thumb: a.thumb || undefined,
    }));
  }
}
