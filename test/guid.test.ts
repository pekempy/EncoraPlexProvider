/**
 * Unit tests for GUID utilities
 */

import {
  validateRatingKey,
  constructGuid,
  parseGuid,
  constructMetadataKey,
  constructMetadataKeyWithChildren,
  createExternalGuid,
} from '../src/utils/guid';

describe('GUID Utilities', () => {
  describe('validateRatingKey', () => {
    it('should accept valid rating keys with letters, numbers, dashes, and underscores', () => {
      expect(validateRatingKey('tmdb-movie-123')).toBe(true);
      expect(validateRatingKey('show_456')).toBe(true);
      expect(validateRatingKey('season-8-ep-12')).toBe(true);
      expect(validateRatingKey('ABC123xyz')).toBe(true);
      expect(validateRatingKey('test_key-123')).toBe(true);
    });

    it('should reject rating keys with invalid characters', () => {
      expect(validateRatingKey('invalid key')).toBe(false); // space
      expect(validateRatingKey('invalid.key')).toBe(false); // period
      expect(validateRatingKey('invalid/key')).toBe(false); // slash
      expect(validateRatingKey('invalid:key')).toBe(false); // colon
      expect(validateRatingKey('invalid@key')).toBe(false); // @
    });

    it('should reject empty strings', () => {
      expect(validateRatingKey('')).toBe(false);
    });
  });

  describe('constructGuid', () => {
    const scheme = 'tv.plex.agents.custom.example.themoviedb.tv';

    it('should construct valid movie GUID', () => {
      const guid = constructGuid(scheme, 'movie', 'tmdb-movie-123');
      expect(guid).toBe('tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-123');
    });

    it('should construct valid show GUID', () => {
      const guid = constructGuid(scheme, 'show', 'tmdb-show-456');
      expect(guid).toBe('tv.plex.agents.custom.example.themoviedb.tv://show/tmdb-show-456');
    });

    it('should construct valid season GUID', () => {
      const guid = constructGuid(scheme, 'season', 'tmdb-season-789');
      expect(guid).toBe('tv.plex.agents.custom.example.themoviedb.tv://season/tmdb-season-789');
    });

    it('should construct valid episode GUID', () => {
      const guid = constructGuid(scheme, 'episode', 'tmdb-episode-012');
      expect(guid).toBe('tv.plex.agents.custom.example.themoviedb.tv://episode/tmdb-episode-012');
    });

    it('should throw error for invalid ratingKey', () => {
      expect(() => {
        constructGuid(scheme, 'movie', 'invalid key');
      }).toThrow('Invalid ratingKey');
    });

    it('should handle ratingKeys with dashes and underscores', () => {
      const guid = constructGuid(scheme, 'movie', 'test_key-123');
      expect(guid).toBe('tv.plex.agents.custom.example.themoviedb.tv://movie/test_key-123');
    });
  });

  describe('parseGuid', () => {
    it('should parse valid GUID correctly', () => {
      const guid = 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-123';
      const parsed = parseGuid(guid);

      expect(parsed.scheme).toBe('tv.plex.agents.custom.example.themoviedb.tv');
      expect(parsed.metadataType).toBe('movie');
      expect(parsed.ratingKey).toBe('tmdb-movie-123');
    });

    it('should parse show GUID', () => {
      const guid = 'tv.plex.agents.custom.example.themoviedb.tv://show/show-456';
      const parsed = parseGuid(guid);

      expect(parsed.scheme).toBe('tv.plex.agents.custom.example.themoviedb.tv');
      expect(parsed.metadataType).toBe('show');
      expect(parsed.ratingKey).toBe('show-456');
    });

    it('should parse Plex official GUIDs', () => {
      const guid = 'plex://movie/5d7768244de0ee001fcc7fed';
      const parsed = parseGuid(guid);

      expect(parsed.scheme).toBe('plex');
      expect(parsed.metadataType).toBe('movie');
      expect(parsed.ratingKey).toBe('5d7768244de0ee001fcc7fed');
    });

    it('should throw error for invalid GUID format', () => {
      expect(() => parseGuid('invalid-guid')).toThrow('Invalid GUID format');
      expect(() => parseGuid('scheme://no-slash')).toThrow('Invalid GUID format');
      expect(() => parseGuid('missing-colon/movie/123')).toThrow('Invalid GUID format');
    });
  });

  describe('constructMetadataKey', () => {
    it('should construct metadata key path', () => {
      const key = constructMetadataKey('tmdb-movie-123');
      expect(key).toBe('/library/metadata/tmdb-movie-123');
    });

    it('should handle different ratingKeys', () => {
      expect(constructMetadataKey('show-456')).toBe('/library/metadata/show-456');
      expect(constructMetadataKey('season_8')).toBe('/library/metadata/season_8');
      expect(constructMetadataKey('ep-01')).toBe('/library/metadata/ep-01');
    });
  });

  describe('constructMetadataKeyWithChildren', () => {
    it('should construct metadata key with children path', () => {
      const key = constructMetadataKeyWithChildren('show-123');
      expect(key).toBe('/library/metadata/show-123/children');
    });

    it('should handle different ratingKeys', () => {
      expect(constructMetadataKeyWithChildren('season-8')).toBe('/library/metadata/season-8/children');
    });
  });

  describe('createExternalGuid', () => {
    it('should create IMDB GUID with string ID', () => {
      const guid = createExternalGuid('imdb', 'tt0088763');
      expect(guid).toBe('imdb://tt0088763');
    });

    it('should create TMDB GUID with numeric ID', () => {
      const guid = createExternalGuid('tmdb', 105);
      expect(guid).toBe('tmdb://105');
    });

    it('should create TVDB GUID', () => {
      const guid = createExternalGuid('tvdb', 152831);
      expect(guid).toBe('tvdb://152831');
    });

    it('should handle various provider names', () => {
      expect(createExternalGuid('imdb', 'tt1234567')).toBe('imdb://tt1234567');
      expect(createExternalGuid('tmdb', 12345)).toBe('tmdb://12345');
      expect(createExternalGuid('tvdb', 67890)).toBe('tvdb://67890');
    });
  });
});
