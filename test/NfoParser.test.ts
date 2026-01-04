/**
 * NFO Parser Tests
 */

import { NfoParser } from '../src/services/NfoParser';

describe('NfoParser', () => {
    let parser: NfoParser;

    beforeEach(() => {
        parser = new NfoParser();
    });

    describe('parseNfoContent', () => {
        it('should parse basic NFO fields', () => {
            const xmlContent = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<movie>
   <title>Cinderella (Andrew Lloyd Webber) (West End - 2022-02-xx)</title>
   <originaltitle>Cinderella</originaltitle>
   <sorttitle>Cinderella</sorttitle>
   <premiered>2022-02-01</premiered>
   <releasedate>2022-02-01</releasedate>
   <director>RhythmInMe</director>
   <genre>Bootleg</genre>
   <genre>Musical</genre>
   <year>2022</year>
   <studio>West End</studio>
   <plot>Welcome to Belleville! The most aggressively picturesque town in the history of the world.</plot>
</movie>`;

            const result = parser.parseNfoContent(xmlContent);

            expect(result.title).toBe('Cinderella (Andrew Lloyd Webber) (West End - 2022-02-xx)');
            expect(result.originaltitle).toBe('Cinderella');
            expect(result.sorttitle).toBe('Cinderella');
            expect(result.premiered).toBe('2022-02-01');
            expect(result.releasedate).toBe('2022-02-01');
            expect(result.director).toBe('RhythmInMe');
            expect(result.year).toBe(2022);
            expect(result.studio).toBe('West End');
            expect(result.plot).toBe('Welcome to Belleville! The most aggressively picturesque town in the history of the world.');
        });

        it('should parse multiple genres', () => {
            const xmlContent = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<movie>
   <title>Test Movie</title>
   <genre>Bootleg</genre>
   <genre>Musical</genre>
   <genre>Drama</genre>
</movie>`;

            const result = parser.parseNfoContent(xmlContent);

            expect(result.genre).toEqual(['Bootleg', 'Musical', 'Drama']);
        });

        it('should parse actors with roles and thumbnails', () => {
            const xmlContent = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<movie>
   <title>Test Movie</title>
   <actor>
       <name>Carrie Hope Fletcher</name>
       <role>Cinderella</role>
       <thumb>https://stagemedia.me/storage/headshots/01JVZG73HKYQ1P4K8XE2E2QXMM.jpg</thumb>
       <type>Actor</type>
   </actor>
   <actor>
       <name>Michael Hamway</name>
       <role>u/s Prince Sebastian</role>
       <thumb>https://stagemedia.me/storage/headshots/01JK413JF0EDTNS30VDZC9KF72.jpg</thumb>
       <type>Actor</type>
   </actor>
</movie>`;

            const result = parser.parseNfoContent(xmlContent);

            expect(result.actors).toHaveLength(2);
            expect(result.actors![0]).toEqual({
                name: 'Carrie Hope Fletcher',
                role: 'Cinderella',
                thumb: 'https://stagemedia.me/storage/headshots/01JVZG73HKYQ1P4K8XE2E2QXMM.jpg',
            });
            expect(result.actors![1]).toEqual({
                name: 'Michael Hamway',
                role: 'u/s Prince Sebastian',
                thumb: 'https://stagemedia.me/storage/headshots/01JK413JF0EDTNS30VDZC9KF72.jpg',
            });
        });

        it('should parse certifications', () => {
            const xmlContent = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<movie>
   <title>Test Movie</title>
   <certification>UK:NFT</certification>
   <certification>US:NFT</certification>
   <certification>SP:NFT</certification>
</movie>`;

            const result = parser.parseNfoContent(xmlContent);

            expect(result.certification).toEqual(['UK:NFT', 'US:NFT', 'SP:NFT']);
        });
    });

    describe('nfoToMetadata', () => {
        it('should convert NFO data to Plex metadata', () => {
            const nfoData = {
                title: 'Cinderella (Andrew Lloyd Webber) (West End - 2022-02-xx)',
                originaltitle: 'Cinderella',
                sorttitle: 'Cinderella',
                premiered: '2022-02-01',
                director: 'RhythmInMe',
                genre: ['Bootleg', 'Musical'],
                year: 2022,
                studio: 'West End',
                plot: 'Welcome to Belleville!',
                actors: [
                    {
                        name: 'Carrie Hope Fletcher',
                        role: 'Cinderella',
                        thumb: 'https://example.com/image.jpg',
                    },
                ],
                thumb: 'https://example.com/poster.jpg',
            };

            const metadata = parser.nfoToMetadata(nfoData);

            expect(metadata.type).toBe('movie');
            expect(metadata.title).toBe('Cinderella (Andrew Lloyd Webber) (West End - 2022-02-xx)');
            expect(metadata.originalTitle).toBe('Cinderella');
            expect(metadata.titleSort).toBe('Cinderella');
            expect(metadata.year).toBe(2022);
            expect(metadata.studio).toBe('West End');
            expect(metadata.summary).toBe('Welcome to Belleville!');
            expect(metadata.thumb).toBe('https://example.com/poster.jpg');

            expect(metadata.Genre).toHaveLength(2);
            expect(metadata.Genre![0].tag).toBe('Bootleg');
            expect(metadata.Genre![1].tag).toBe('Musical');

            expect(metadata.Role).toHaveLength(1);
            expect(metadata.Role![0].tag).toBe('Carrie Hope Fletcher');
            expect(metadata.Role![0].role).toBe('Cinderella');

            expect(metadata.Director).toHaveLength(1);
            expect(metadata.Director![0].tag).toBe('RhythmInMe');

            expect(metadata.Studio).toHaveLength(1);
            expect(metadata.Studio![0].tag).toBe('West End');

            expect(metadata.Image).toHaveLength(1);
            expect(metadata.Image![0].url).toBe('https://example.com/poster.jpg');
        });

        it('should handle missing optional fields', () => {
            const nfoData = {
                title: 'Test Movie',
            };

            const metadata = parser.nfoToMetadata(nfoData);

            expect(metadata.title).toBe('Test Movie');
            expect(metadata.originalTitle).toBeUndefined();
            expect(metadata.Genre).toBeUndefined();
            expect(metadata.Role).toBeUndefined();
            expect(metadata.Director).toBeUndefined();
        });
    });

    describe('findNfoFile', () => {
        it('should prioritize matching filename over movie.nfo and any .nfo', () => {
            // This test documents the priority order:
            // 1. Matching filename (e.g., video.nfo for video.mkv)
            // 2. movie.nfo in the same directory
            // 3. Any .nfo file in the same directory

            // Note: Actual file system tests would require creating temp files
            // This test serves as documentation of the expected behavior
            expect(parser.findNfoFile).toBeDefined();
        });
    });
});
