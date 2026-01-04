/**
 * NFO Parser Service - Parses NFO files as fallback when Encora matching fails
 */

import * as fs from 'fs';
import * as path from 'path';
import { MovieMetadata, Image, Person, Genre, Guid, Studio, Country } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { constructMetadataKey, constructGuid, createExternalGuid } from '../utils/guid';
import { config } from '../config/env';

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

        // Robust helper to get tag content, handling attributes and returning undefined for empty tags
        const getTagContent = (tag: string, content: string): string | undefined => {
            const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
            const match = content.match(regex);
            if (match && match[1].trim()) {
                return match[1].trim();
            }
            return undefined;
        };

        const getAllTagContents = (tag: string, content: string): string[] => {
            const regex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
            const matches = content.matchAll(regex);
            return Array.from(matches, m => m[1].trim()).filter(val => val !== '');
        };

        // Isolate the movie block content by removing all actor blocks
        const actorRegex = /<actor\b[^>]*>([\s\S]*?)<\/actor>/gi;
        const actorMatches = Array.from(xmlContent.matchAll(actorRegex));
        const movieOnlyContent = xmlContent.replace(actorRegex, '');

        // Extract basic fields from top-level only
        data.title = getTagContent('title', movieOnlyContent);
        data.originaltitle = getTagContent('originaltitle', movieOnlyContent);
        data.sorttitle = getTagContent('sorttitle', movieOnlyContent);
        data.premiered = getTagContent('premiered', movieOnlyContent);
        data.releasedate = getTagContent('releasedate', movieOnlyContent);
        data.director = getTagContent('director', movieOnlyContent);
        data.studio = getTagContent('studio', movieOnlyContent);
        data.plot = getTagContent('plot', movieOnlyContent);
        data.thumb = getTagContent('thumb', movieOnlyContent);

        // Extract year
        const yearStr = getTagContent('year', movieOnlyContent);
        if (yearStr) {
            const parsedYear = parseInt(yearStr, 10);
            if (!isNaN(parsedYear)) {
                data.year = parsedYear;
            }
        }

        // Extract genres and certifications
        data.genre = getAllTagContents('genre', movieOnlyContent);
        data.certification = getAllTagContents('certification', movieOnlyContent);

        // Process actors
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
        let absolutePath = videoFilePath;

        // Resolve relative paths using base path from config
        if (!path.isAbsolute(videoFilePath) && config.plex.libraryBasePath) {
            absolutePath = path.join(config.plex.libraryBasePath, videoFilePath);
            console.log(`[NFO] Resolved relative path to: ${absolutePath}`);
        }

        console.log(`[NFO] Looking for NFO file for: ${absolutePath}`);
        console.log(`[NFO] Path is absolute: ${path.isAbsolute(absolutePath)}`);

        // Try same name as video file with .nfo extension
        const basePath = absolutePath.replace(/\.[^.]+$/, '');
        const nfoPath = `${basePath}.nfo`;

        console.log(`[NFO] Trying matching filename: ${nfoPath}`);
        if (fs.existsSync(nfoPath)) {
            console.log(`Found matching NFO: ${nfoPath}`);
            return nfoPath;
        }

        // Try movie.nfo in the same directory
        const dir = path.dirname(absolutePath);
        const movieNfo = path.join(dir, 'movie.nfo');

        console.log(`[NFO] Trying movie.nfo: ${movieNfo}`);
        if (fs.existsSync(movieNfo)) {
            console.log(`Found movie.nfo: ${movieNfo}`);
            return movieNfo;
        }

        // Try any .nfo file in the same directory
        console.log(`[NFO] Trying to read directory: ${dir}`);

        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                console.log(`[NFO] Files in directory: ${files.length} items`);
                const nfoFiles = files.filter(file => file.toLowerCase().endsWith('.nfo'));
                console.log(`[NFO] NFO files found: ${nfoFiles.join(', ')}`);

                if (nfoFiles.length > 0) {
                    const foundNfo = path.join(dir, nfoFiles[0]);
                    console.log(`Found any NFO file: ${foundNfo}`);
                    return foundNfo;
                }
            } else {
                console.log(`[NFO] Directory does not exist: ${dir}`);
            }
        } catch (error) {
            console.error(`[NFO] Error reading directory ${dir}:`, error);
        }

        console.log(`[NFO] No NFO file found for: ${absolutePath}`);
        return null;
    }

    /**
     * Read and parse NFO file
     */
    readNfoFile(nfoPath: string): NfoData | null {
        try {
            const content = fs.readFileSync(nfoPath, 'utf-8');
            const data = this.parseNfoContent(content);

            console.log('--- Extracted NFO Attributes ---');
            console.log(JSON.stringify({
                title: data.title,
                originaltitle: data.originaltitle,
                premiered: data.premiered,
                releasedate: data.releasedate,
                director: data.director,
                studio: data.studio,
                year: data.year,
                certification: data.certification,
                genres: data.genre,
                actorCount: data.actors?.length,
                thumb: data.thumb
            }, null, 2));
            console.log('-------------------------------');

            return data;
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
        // If sourceFile is provided, we include it (encoded) so we can find it later in MetadataService
        const titleSlug = (nfoData.title || 'unknown')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        let ratingKey = `nfo-${titleSlug}-${nfoData.year || 'unknown'}`;

        if (sourceFile) {
            // Use hex encoding for the path to keep it safe for URLs/ratingKeys
            const encodedPath = Buffer.from(sourceFile).toString('hex');
            ratingKey = `nfo-file-${encodedPath}`;
        }

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
            contentRating: nfoData.certification && nfoData.certification.length > 0 ? nfoData.certification[0] : undefined,
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

        console.log('--- Mapped Plex Metadata ---');
        console.log(JSON.stringify({
            title: metadata.title,
            contentRating: metadata.contentRating,
            originallyAvailableAt: metadata.originallyAvailableAt,
            year: metadata.year,
            studio: metadata.studio,
            Director: metadata.Director?.map(d => d.tag),
            RoleCount: metadata.Role?.length,
            firstRole: metadata.Role?.[0]
        }, null, 2));
        console.log('---------------------------');

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
