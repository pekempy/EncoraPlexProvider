import {
  MovieMetadata,
  MediaContainer,
  Image,
  Genre,
  Guid,
  Person,
  Rating,
} from '../src/models/Metadata';

describe('Metadata Models', () => {
  describe('MovieMetadata', () => {
    it('should validate required fields for movie', () => {
      const movie: MovieMetadata = {
        type: 'movie',
        ratingKey: 'tmdb-movie-105',
        key: '/library/metadata/tmdb-movie-105',
        guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
        title: 'Back to the Future',
        originallyAvailableAt: '1985-07-03',
      };

      expect(movie.type).toBe('movie');
      expect(movie.ratingKey).toBe('tmdb-movie-105');
      expect(movie.title).toBe('Back to the Future');
    });

    it('should allow all optional movie fields', () => {
      const movie: MovieMetadata = {
        type: 'movie',
        ratingKey: 'tmdb-movie-105',
        key: '/library/metadata/tmdb-movie-105',
        guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
        title: 'Back to the Future',
        originallyAvailableAt: '1985-07-03',
        thumb: 'https://image.tmdb.org/poster.jpg',
        art: 'https://image.tmdb.org/backdrop.jpg',
        contentRating: 'PG',
        originalTitle: 'Back to the Future',
        year: 1985,
        summary: 'A teenager is accidentally sent back in time...',
        duration: 6960000,
        tagline: 'He was never in time for his classes...',
        studio: 'Universal Pictures',
        theme: 'https://example.com/theme.mp3',
        isAdult: false,
      };

      expect(movie.year).toBe(1985);
      expect(movie.duration).toBe(6960000);
      expect(movie.studio).toBe('Universal Pictures');
    });

    it('should allow Image array', () => {
      const images: Image[] = [
        { type: 'coverPoster', url: 'https://example.com/poster.jpg', alt: 'Movie Poster' },
        { type: 'background', url: 'https://example.com/backdrop.jpg' },
        { type: 'clearLogo', url: 'https://example.com/logo.png' },
      ];

      const movie: MovieMetadata = {
        type: 'movie',
        ratingKey: 'tmdb-movie-105',
        key: '/library/metadata/tmdb-movie-105',
        guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
        title: 'Back to the Future',
        originallyAvailableAt: '1985-07-03',
        Image: images,
      };

      expect(movie.Image).toHaveLength(3);
      expect(movie.Image?.[0].type).toBe('coverPoster');
    });

    it('should allow Genre array', () => {
      const genres: Genre[] = [
        { tag: 'Adventure' },
        { tag: 'Comedy' },
        { tag: 'Science Fiction' },
      ];

      const movie: MovieMetadata = {
        type: 'movie',
        ratingKey: 'tmdb-movie-105',
        key: '/library/metadata/tmdb-movie-105',
        guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
        title: 'Back to the Future',
        originallyAvailableAt: '1985-07-03',
        Genre: genres,
      };

      expect(movie.Genre).toHaveLength(3);
    });

    it('should allow external Guid array', () => {
      const guids: Guid[] = [
        { id: 'imdb://tt0088763' },
        { id: 'tmdb://105' },
        { id: 'tvdb://299' },
      ];

      const movie: MovieMetadata = {
        type: 'movie',
        ratingKey: 'tmdb-movie-105',
        key: '/library/metadata/tmdb-movie-105',
        guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
        title: 'Back to the Future',
        originallyAvailableAt: '1985-07-03',
        Guid: guids,
      };

      expect(movie.Guid).toHaveLength(3);
      expect(movie.Guid?.[0].id).toBe('imdb://tt0088763');
    });

    it('should allow Role array with cast', () => {
      const cast: Person[] = [
        {
          tag: 'Michael J. Fox',
          role: 'Marty McFly',
          order: 1,
          thumb: 'https://example.com/actor.jpg',
        },
        {
          tag: 'Christopher Lloyd',
          role: 'Emmett Brown',
          order: 2,
        },
      ];

      const movie: MovieMetadata = {
        type: 'movie',
        ratingKey: 'tmdb-movie-105',
        key: '/library/metadata/tmdb-movie-105',
        guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
        title: 'Back to the Future',
        originallyAvailableAt: '1985-07-03',
        Role: cast,
      };

      expect(movie.Role).toHaveLength(2);
      expect(movie.Role?.[0].role).toBe('Marty McFly');
    });

    it('should allow Rating array', () => {
      const ratings: Rating[] = [
        { image: 'imdb://image.rating', type: 'audience', value: 8.5 },
        { image: 'rottentomatoes://image.rating.ripe', type: 'critic', value: 9.3 },
      ];

      const movie: MovieMetadata = {
        type: 'movie',
        ratingKey: 'tmdb-movie-105',
        key: '/library/metadata/tmdb-movie-105',
        guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
        title: 'Back to the Future',
        originallyAvailableAt: '1985-07-03',
        Rating: ratings,
      };

      expect(movie.Rating).toHaveLength(2);
      expect(movie.Rating?.[0].value).toBe(8.5);
    });
  });
});

describe('MediaContainer', () => {
  it('should wrap metadata in proper structure', () => {
    const container: MediaContainer = {
      offset: 0,
      totalSize: 1,
      identifier: 'tv.plex.agents.custom.example.themoviedb.tv',
      size: 1,
      Metadata: [
        {
          type: 'movie',
          ratingKey: 'tmdb-movie-105',
          key: '/library/metadata/tmdb-movie-105',
          guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-105',
          title: 'Back to the Future',
          originallyAvailableAt: '1985-07-03',
        },
      ],
    };

    expect(container.size).toBe(1);
    expect(container.Metadata).toHaveLength(1);
    expect(container.offset).toBe(0);
  });

  it('should support multiple metadata items', () => {
    const container: MediaContainer = {
      offset: 0,
      totalSize: 2,
      identifier: 'tv.plex.agents.custom.example.themoviedb.tv',
      size: 2,
      Metadata: [
        {
          type: 'movie',
          ratingKey: 'tmdb-movie-1',
          key: '/library/metadata/tmdb-movie-1',
          guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-1',
          title: 'Movie 1',
          originallyAvailableAt: '2010-04-05',
        },
        {
          type: 'movie',
          ratingKey: 'tmdb-movie-2',
          key: '/library/metadata/tmdb-movie-2',
          guid: 'tv.plex.agents.custom.example.themoviedb.tv://movie/tmdb-movie-2',
          title: 'Movie 2',
          originallyAvailableAt: '2010-10-11',
        },
      ],
    };

    expect(container.size).toBe(2);
    expect(container.totalSize).toBe(2);
    expect(container.Metadata).toHaveLength(2);
  });
});
