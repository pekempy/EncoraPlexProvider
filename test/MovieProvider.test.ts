
import {
  createMovieProvider,
  getMovieProviderResponse,
  MOVIE_PROVIDER_IDENTIFIER,
  MOVIE_PROVIDER_TITLE,
  MOVIE_PROVIDER_VERSION,
} from '../src/providers/MovieProvider';
import { MetadataType, FeatureType } from '../src/models/MediaProvider';

describe('Movie MediaProvider', () => {
  describe('createMovieProvider', () => {
    const provider = createMovieProvider();

    it('should have the correct identifier', () => {
      expect(provider.identifier).toBe('tv.plex.agents.custom.encora');
      expect(provider.identifier).toBe(MOVIE_PROVIDER_IDENTIFIER);
    });

    it('should have the correct title', () => {
      expect(provider.title).toBe('Encora Movie Provider');
      expect(provider.title).toBe(MOVIE_PROVIDER_TITLE);
    });

    it('should have the correct version', () => {
      expect(provider.version).toBe('1.0.0');
      expect(provider.version).toBe(MOVIE_PROVIDER_VERSION);
    });

    it('should support Movie type', () => {
      expect(provider.Types).toHaveLength(1);
      const types = provider.Types.map((t: { type: any; }) => t.type);
      expect(types).toContain(MetadataType.MOVIE);
    });

    it('should not support TV Show, Season, or Episode types', () => {
      const types = provider.Types.map((t: { type: any; }) => t.type);
      expect(types).not.toContain(MetadataType.SHOW);
      expect(types).not.toContain(MetadataType.SEASON);
      expect(types).not.toContain(MetadataType.EPISODE);
    });

    it('should support Metadata and Match features', () => {
      expect(provider.Feature).toHaveLength(2);
      const features = provider.Feature.map((f: { type: any; }) => f.type);
      expect(features).toContain(FeatureType.METADATA);
      expect(features).toContain(FeatureType.MATCH);
    });
  });

  describe('getMovieProviderResponse', () => {
    it('should return complete provider definition', () => {
      const response = getMovieProviderResponse();

      expect(response).toHaveProperty('MediaProvider');
      expect(response.MediaProvider.identifier).toBe(MOVIE_PROVIDER_IDENTIFIER);
      expect(response.MediaProvider.title).toBe(MOVIE_PROVIDER_TITLE);
      expect(response.MediaProvider.Types).toHaveLength(1);
      expect(response.MediaProvider.Feature).toHaveLength(2);
    });
  });

  describe('Type Definitions', () => {
    it('should have correct numeric values for metadata types', () => {
      const provider = createMovieProvider();
      const movieType = provider.Types.find((t: { type: MetadataType; }) => t.type === MetadataType.MOVIE);

      expect(movieType?.type).toBe(1);
    });
  });
});
