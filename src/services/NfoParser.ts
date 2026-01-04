/**
 * NFO Parser Service - Parses NFO files as fallback when Encora matching fails
 */

import * as fs from 'fs';
import * as path from 'path';
import { MovieMetadata, Image, Person, Genre, Guid, Studio, Country } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { constructMetadataKey, constructGuid, createExternalGuid } from '../utils/guid';

/**
 * Parsed NFO data structure
 */
export interface NfoData {
    title?: string;
    originaltitle?: string;
    sorttitle?: string;
    premiered?: string;
    releasedate?: string;
    director?: string;
    genre?: string[];
    year?: number;
    studio?: string;
    plot?: string;
    certification?: string[];
    actors?: Array<{
        name: string;
        role: string;
        thumb?: string;
    }>;
    thumb?: string;
}

export class NfoParser {
    /**
     * Parse XML NFO content
     */
    parseNfoContent(xmlContent: string): NfoData {
        const data: NfoData = {
            genre: [],
            certification: [],
            actors: [],
        };

        // Simple XML parsing (for production, consider using a proper XML parser library)
        const getTagContent = (tag: string, content: string): string | undefined => {
            const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
            const match = content.match(regex);
            return match ? match[1].trim() : undefined;
        };

        const getAllTagContents = (tag: string, content: string): string[] => {
            const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'gi');
            const matches = content.matchAll(regex);
            return Array.from(matches, m => m[1].trim());
        };

        // Extract basic fields
        data.title = getTagContent('title', xmlContent);
        data.originaltitle = getTagContent('originaltitle', xmlContent);
        data.sorttitle = getTagContent('sorttitle', xmlContent);
        data.premiered = getTagContent('premiered', xmlContent);
        data.releasedate = getTagContent('releasedate', xmlContent);
        data.director = getTagContent('director', xmlContent);
        data.studio = getTagContent('studio', xmlContent);
        data.plot = getTagContent('plot', xmlContent);
        data.thumb = getTagContent('thumb', xmlContent);

        // Extract year
        const yearStr = getTagContent('year', xmlContent);
        if (yearStr) {
            data.year = parseInt(yearStr, 10);
        }

        // Extract genres
        data.genre = getAllTagContents('genre', xmlContent);

        // Extract certifications
        data.certification = getAllTagContents('certification', xmlContent);

        // Extract actors
        const actorRegex = /<actor>([\s\S]*?)<\/actor>/gi;
        const actorMatches = xmlContent.matchAll(actorRegex);

        for (const actorMatch of actorMatches) {
            const actorBlock = actorMatch[1];
            const name = getTagContent('name', actorBlock);
            const role = getTagContent('role', actorBlock);
            const thumb = getTagContent('thumb', actorBlock);

            if (name) {
                data.actors!.push({
                    name,
                    role: role || '',
                    thumb,
                });
            }
        }

        return data;
    }

    /**
     * Find NFO file for a given video file path
     */
    findNfoFile(videoFilePath: string): string | null {
        // Try same name as video file with .nfo extension
        const basePath = videoFilePath.replace(/\.[^.]+$/, '');
        const nfoPath = `${basePath}.nfo`;

        if (fs.existsSync(nfoPath)) {
            console.log(`Found matching NFO: ${nfoPath}`);
            return nfoPath;
        }

        // Try movie.nfo in the same directory
        const dir = path.dirname(videoFilePath);
        const movieNfo = path.join(dir, 'movie.nfo');

        if (fs.existsSync(movieNfo)) {
            console.log(`Found movie.nfo: ${movieNfo}`);
            return movieNfo;
        }

        // Try any .nfo file in the same directory
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                const nfoFiles = files.filter(file => file.toLowerCase().endsWith('.nfo'));

                if (nfoFiles.length > 0) {
                    const foundNfo = path.join(dir, nfoFiles[0]);
                    console.log(`Found any NFO file: ${foundNfo}`);
                    return foundNfo;
                }
            }
        } catch (error) {
            console.error(`Error reading directory ${dir}:`, error);
        }

        return null;
    }

    /**
     * Read and parse NFO file
     */
    readNfoFile(nfoPath: string): NfoData | null {
        try {
            const content = fs.readFileSync(nfoPath, 'utf-8');
            return this.parseNfoContent(content);
        } catch (error) {
            console.error(`Error reading NFO file ${nfoPath}:`, error);
            return null;
        }
    }

    /**
     * Convert NFO data to Plex MovieMetadata
     */
    nfoToMetadata(nfoData: NfoData, sourceFile?: string): MovieMetadata {
        // Generate a unique ratingKey based on the title and year
        const titleSlug = (nfoData.title || 'unknown')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
        const ratingKey = `nfo-${titleSlug}-${nfoData.year || 'unknown'}`;

        // Map actors
        const roles: Person[] = (nfoData.actors || []).map((actor, index) => ({
            tag: actor.name,
            role: actor.role,
            thumb: actor.thumb,
            order: index,
        }));

        // Map genres
        const genres: Genre[] = (nfoData.genre || []).map(g => ({ tag: g }));

        // Map images
        const images: Image[] = [];
        if (nfoData.thumb) {
            images.push({
                type: 'coverPoster',
                url: nfoData.thumb,
                alt: nfoData.title,
            });
        }

        // Map director
        const directors: Person[] = nfoData.director ? [{ tag: nfoData.director }] : [];

        // Map studio
        const studios: Studio[] = nfoData.studio ? [{ tag: nfoData.studio }] : [];

        // Create external GUID (use title as identifier)
        const guids: Guid[] = [
            { id: createExternalGuid('nfo', titleSlug) }
        ];

        const metadata: MovieMetadata = {
            type: 'movie',
            ratingKey: ratingKey,
            key: constructMetadataKey(ratingKey),
            guid: constructGuid(MOVIE_PROVIDER_IDENTIFIER, 'movie', ratingKey),
            title: nfoData.title || 'Unknown',
            originalTitle: nfoData.originaltitle,
            titleSort: nfoData.sorttitle,
            originallyAvailableAt: nfoData.premiered || nfoData.releasedate || '',
            year: nfoData.year,
            summary: nfoData.plot,
            studio: nfoData.studio,
            thumb: nfoData.thumb,
            Image: images.length > 0 ? images : undefined,
            Genre: genres.length > 0 ? genres : undefined,
            Role: roles.length > 0 ? roles : undefined,
            Director: directors.length > 0 ? directors : undefined,
            Studio: studios.length > 0 ? studios : undefined,
            Guid: guids,
        };

        return metadata;
    }

    /**
     * Try to find and parse NFO for a given filename
     */
    tryParseNfoForFile(filename: string): MovieMetadata | null {
        const nfoPath = this.findNfoFile(filename);
        if (!nfoPath) {
            console.log(`No NFO file found for: ${filename}`);
            return null;
        }

        console.log(`Found NFO file: ${nfoPath}`);
        const nfoData = this.readNfoFile(nfoPath);
        if (!nfoData) {
            return null;
        }

        return this.nfoToMetadata(nfoData, filename);
    }
}
