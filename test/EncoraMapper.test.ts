import { EncoraRecording, EncoraSubtitle } from '../src/types/encora';
import { StageMediaResponse } from '../src/services/StageMediaClient';

// Mock config before importing mapper
jest.mock('../src/config/env', () => ({
  config: {
    formatting: {
      titleFormat: '{{show}} {{tour}} | ({{date}}) {{master}}',
      dateReplaceChar: 'x'
    }
  }
}));

import { EncoraMapper } from '../src/mappers/EncoraMapper';

describe('EncoraMapper', () => {
  const mapper = new EncoraMapper();

  const mockDate = {
    full_date: '2025-01-01',
    month_known: true,
    day_known: true,
    date_variant: null,
    time: '20:00'
  };

  const mockRecording: EncoraRecording = {
    id: 12345,
    show: 'Mock Show',
    tour: 'Mock Tour',
    date: mockDate,
    master: 'MockMaster',
    nft: {
      nft_date: null,
      nft_forever: false
    },
    cast: [
      {
        performer: { id: 1, name: 'Actor One', slug: 'actor-one', url: 'http://encora.it/actor/1' },
        character: { id: 10, name: 'Character One', slug: 'char-one', url: '', order: 1 },
        status: 'Lead'
      }
    ],
    notes: 'Some notes <p>HTML</p>',
    master_notes: null,
    release_format: 'VOB',
    metadata: {
      show_id: 100,
      is_opening: false,
      is_closing: false,
      is_preview: false,
      is_concert: false,
      is_nfs: false,
      is_favourite: false,
      venue: 'Mock Venue',
      city: 'Mock City',
      media_type: 'Video',
      recording_type: 'Pro-Shot',
      amount_recorded: 'Full',
      gifting_status: 'Open',
      limited_status: 'No',
      boot_camp_recommended: false,
      has_screenshots: false,
      has_subtitles: false,
      owners_count: 10,
      wanters_count: 5,
      show_description: 'Description <b>HTML</b>',
      last_updated: '2025-01-01'
    }
  };

  it('should map basic recording fields', () => {
    const metadata = mapper.mapRecording(mockRecording);

    expect(metadata.type).toBe('movie');

    // Default mock format: "{{show}} {{tour}} | ({{date}}) {{master}}"
    // Date: January 01, 2025
    expect(metadata.title).toBe('Mock Show Mock Tour | (January 01, 2025) MockMaster');

    expect(metadata.originalTitle).toBe('Mock Show - Mock Tour');
    expect(metadata.year).toBe(2025);
    expect(metadata.originallyAvailableAt).toBe('2025-01-01');
  });

  it('should sanitize summary (stripping HTML)', () => {
    const metadata = mapper.mapRecording(mockRecording);
    // show_description takes precedence: "Description <b>HTML</b>"
    expect(metadata.summary).toBe('Description HTML');
  });

  it('should map master to Director and editionTitle', () => {
    const metadata = mapper.mapRecording(mockRecording);
    expect(metadata.Director).toBeDefined();
    expect(metadata.Director?.[0].tag).toBe('MockMaster');
    expect(metadata.editionTitle).toBe('MockMaster');
  });

  it('should map genres from recording/media type', () => {
    const metadata = mapper.mapRecording(mockRecording);
    expect(metadata.Genre).toBeDefined();
    const genreTags = metadata.Genre?.map(g => g.tag);
    expect(genreTags).toContain('Pro-Shot');
    expect(genreTags).toContain('Video');
  });

  it('should set contentRating to NFT if nft_forever is true', () => {
    const nftRecording = { ...mockRecording, nft: { nft_forever: true, nft_date: null } };
    const metadata = mapper.mapRecording(nftRecording);
    expect(metadata.contentRating).toBe('NFT');
  });

  it('should set contentRating to NFT if nft_date is in the future', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const nftRecording = {
      ...mockRecording,
      nft: { nft_forever: false, nft_date: futureDate.toISOString() }
    };
    const metadata = mapper.mapRecording(nftRecording);
    expect(metadata.contentRating).toBe('NFT');
  });

  it('should map StageMedia images and performer photos', () => {
    const stageMediaResponse: StageMediaResponse = {
      performers: [
        { id: 1, url: 'http://stagemedia.me/actor1.jpg' }
      ],
      posters: ['http://stagemedia.me/poster1.jpg']
    };

    const metadata = mapper.mapRecording(mockRecording, stageMediaResponse);

    // Check cast thumb
    expect(metadata.Role).toBeDefined();
    expect(metadata.Role?.[0].tag).toBe('Actor One');
    expect(metadata.Role?.[0].thumb).toBe('http://stagemedia.me/actor1.jpg');

    // Check posters
    expect(metadata.Image).toBeDefined();
    expect(metadata.Image?.[0].url).toBe('http://stagemedia.me/poster1.jpg');
    expect(metadata.thumb).toBe('http://stagemedia.me/poster1.jpg');
  });

  it('should fall back to default image if performer not found in StageMedia', () => {
    const noUrlRecording = { ...mockRecording };
    noUrlRecording.cast = [{ ...mockRecording.cast[0], performer: { ...mockRecording.cast[0].performer, url: '' } }];

    const metadata = mapper.mapRecording(noUrlRecording, { performers: [], posters: [] });
    expect(metadata.Role?.[0].thumb).toBe('https://i.ibb.co/xSHDBZDp/c-Xq-YZEu.png');
  });

  it('should map subtitles', () => {
    const subtitles: EncoraSubtitle[] = [
      { recording_id: 1, url: 'sub1.srt', language: 'French', file_type: 'SRT', author: 'Test' },
      { recording_id: 2, url: 'sub2.srt', language: 'Portuguese (BR)', file_type: 'SRT', author: 'Test' },
      { recording_id: 3, url: 'sub3.srt', language: 'Norwegian', file_type: 'SRT', author: 'Test' }
    ];

    const result = mapper.mapRecording(mockRecording, undefined, subtitles);

    expect(result.Subtitle).toBeDefined();
    expect(result.Subtitle).toHaveLength(3);

    // French -> fre
    expect(result.Subtitle![0].language).toBe('fre');

    // Portuguese (BR) -> por
    expect(result.Subtitle![1].language).toBe('por');

    // Norwegian -> nor
    expect(result.Subtitle![2].language).toBe('nor');
  });
});
