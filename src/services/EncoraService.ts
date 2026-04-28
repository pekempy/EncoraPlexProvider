import { EncoraClient } from './EncoraClient';
import { StageMediaClient } from './StageMediaClient';
import { EncoraMapper } from '../mappers/EncoraMapper';
import { FileSystemService } from './FileSystemService';
import { PlexService } from './PlexService';
import { MetadataResponse } from '../models/Metadata';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { config } from '../config/env';
import path from 'path';

export class EncoraService {
    private encoraClient: EncoraClient;
    private stageMediaClient: StageMediaClient;
    private mapper: EncoraMapper;
    private fileSystemService: FileSystemService;
    private plexService: PlexService;

    constructor(apiKey: string) {
        this.encoraClient = new EncoraClient(apiKey);
        // StageMedia uses a different API key from env
        this.stageMediaClient = new StageMediaClient(config.stagemedia.apiKey);
        this.mapper = new EncoraMapper();
        this.fileSystemService = new FileSystemService();
        this.plexService = new PlexService();
    }

    /**
     * Search for recordings by show name
     */
    public async search(query: string): Promise<MetadataResponse> {
        const results = await this.encoraClient.getRecordingDetails(parseInt(query) || 0).catch(() => null);
        const metadata = results ? [this.mapper.mapRecording(results, undefined, [], undefined)] : [];
        
        return {
            MediaContainer: {
                size: metadata.length,
                totalSize: metadata.length,
                offset: 0,
                identifier: MOVIE_PROVIDER_IDENTIFIER,
                Metadata: metadata
            }
        };
    }

    /**
     * Get recording details and map to Plex metadata
     */
    public async matchRecording(id: number, filename?: string, aliasId?: number): Promise<MetadataResponse> {
        try {
            // 1. Get core recording details from Encora
            const recording = await this.encoraClient.getRecordingDetails(id);

            // 2. Fetch images from StageMedia
            let stageMediaImages;
            try {
                // Collect all performer IDs for the show
                const performerIds = recording.cast ? recording.cast.map(c => c.performer.id) : [];
                stageMediaImages = await this.stageMediaClient.getImages(recording.metadata.show_id, performerIds);
            } catch (err) {
                console.error(`Failed to fetch images from StageMedia: ${err}`);
            }

            // 3. Get subtitles from Encora
            let subtitles: any[] = [];
            try {
                subtitles = await this.encoraClient.getRecordingSubtitles(id);
                console.log(`Fetched ${subtitles.length} subtitles for recording ${id}`);
            } catch (err) {
                console.error(`Failed to fetch subtitles: ${err}`);
            }

            // Fetch local subtitles if libraryBasePath is set
            let localSubtitles: any[] = [];
            if (config.plex.libraryBasePath) {
                try {
                    let localDir: string | null = null;
                    
                    // Priority 1: Use directory of provided filename
                    if (filename) {
                        const fullPath = path.isAbsolute(filename) ? filename : path.join(config.plex.libraryBasePath, filename);
                        localDir = path.dirname(fullPath);
                        if (!fs.existsSync(localDir)) {
                            localDir = null;
                        } else {
                            console.log(`[EncoraService] Using directory from provided filename: ${localDir}`);
                        }
                    }

                    // Priority 2: Find by canonical ID
                    if (!localDir) {
                        localDir = this.fileSystemService.findRecordingDirectory(id);
                        if (localDir) console.log(`[EncoraService] Found directory by canonical ID ${id}: ${localDir}`);
                    }

                    // Priority 3: Find by alias ID
                    if (!localDir && aliasId) {
                        localDir = this.fileSystemService.findRecordingDirectory(aliasId);
                        if (localDir) console.log(`[EncoraService] Found directory by alias ID ${aliasId}: ${localDir}`);
                    }

                    if (localDir) {
                        const existingLocal = this.fileSystemService.findSubtitles(localDir);
                        console.log(`Found ${existingLocal.length} existing local subtitles in ${localDir}`);

                        // 2. If no local subtitles but we have Encora subtitles, download them!
                        if (existingLocal.length === 0 && subtitles.length > 0) {
                            const videoFile = this.fileSystemService.findVideoFile(localDir);
                            const videoBaseName = videoFile ? videoFile.substring(0, videoFile.lastIndexOf('.')) : 'Encora';
                            
                            for (const sub of subtitles) {
                                if (sub.author !== 'Local' && sub.url && sub.url.startsWith('http')) {
                                    const ext = sub.file_type.toLowerCase();
                                    const langSuffix = sub.language.length <= 3 ? sub.language.toLowerCase() : this.mapper.mapLanguage(sub.language);
                                    
                                    const coverage = sub.coverage ? ` [${sub.coverage}]` : '';
                                    const subFilename = `${sub.author}${coverage}.${langSuffix}.${ext}`;
                                    
                                    await this.fileSystemService.downloadSubtitle(sub.url, localDir, subFilename);
                                }
                            }
                            // Refresh local list after downloads
                            const updatedLocal = this.fileSystemService.findSubtitles(localDir);
                            existingLocal.push(...updatedLocal);
                        }

                        localSubtitles = existingLocal;

                        // 3. Map all found local subtitles to proxy URLs
                        const mappedLocalSubs = existingLocal.map(ls => {
                            const ext = ls.path.split('.').pop()?.toUpperCase() || 'SRT';
                            const displayType = (ext === 'SUB' || ext === 'IDX') ? 'VOBSUB' : ext;
                            
                            return {
                                recording_id: id,
                                url: `${config.server.baseUrl}/subtitles?path=${encodeURIComponent(ls.path)}`,
                                language: ls.language || 'Unknown',
                                file_type: displayType,
                                author: ls.author || 'Local',
                                coverage: ls.coverage
                            };
                        });
                        
                        // Replace or append local subtitles
                        const remoteOnly = subtitles.filter(s => {
                            const code = this.mapper.mapLanguage(s.language);
                            const hasLocal = existingLocal.some(l => 
                                l.name.includes(`.${code}.`) || 
                                (code === 'en' && l.name.includes('.eng.'))
                            );
                            return s.author !== 'Local' && !hasLocal;
                        });
                        subtitles = [...mappedLocalSubs, ...remoteOnly];

                        // If filename wasn't provided (metadata request), try to find it locally
                        if (!filename) {
                            const foundVideo = this.fileSystemService.findVideoFile(localDir);
                            if (foundVideo) {
                                filename = path.join(localDir, foundVideo);
                                console.log(`[EncoraService] Auto-resolved filename: ${filename}`);
                            }
                        }
                    }
                } catch (fsError) {
                    console.error('[EncoraService] Failed to scan or download local subtitles:', fsError);
                }
            }

            console.log(`[EncoraService] Passing filename to mapper: ${filename || 'UNDEFINED'}`);
            const metadata = this.mapper.mapRecording(recording, stageMediaImages, subtitles, filename, aliasId);

            // 4. Force-upload local subtitles to Plex if configured
            if (config.plex.token && localSubtitles.length > 0) {
                this.triggerPlexUpload(metadata.guid, localSubtitles).catch(err => {
                    console.error('[EncoraService] Failed to trigger Plex subtitle upload:', err);
                });
            }

            return {
                MediaContainer: {
                    size: 1,
                    totalSize: 1,
                    offset: 0,
                    identifier: MOVIE_PROVIDER_IDENTIFIER,
                    Metadata: [metadata]
                }
            };
        } catch (err) {
            console.error(`Error matching recording by ID: ${err}`);
            throw err;
        }
    }

    /**
     * Finds the Plex internal ID and uploads local subtitles
     */
    private async triggerPlexUpload(guid: string, localSubtitles: any[]): Promise<void> {
        if (localSubtitles.length === 0) return;

        console.log(`[EncoraService] Attempting to manage subtitles for GUID ${guid}`);
        
        // Wait a small bit for Plex to process the metadata/match if this is a fresh match
        await new Promise(resolve => setTimeout(resolve, 2000));

        const ratingKey = await this.plexService.findInternalId(guid);
        if (!ratingKey) {
            console.warn(`[EncoraService] Could not find Plex internal ID for GUID ${guid}. Post-upload skipped.`);
            return;
        }

        const deletedIds = new Set<number>();
        
        for (const sub of localSubtitles) {
            // Re-fetch existing streams inside the loop to avoid stale data and double-deletes
            const existingStreams = await this.plexService.getSubtitleStreams(ratingKey);
            
            const langCode = this.mapper.mapLanguage(sub.language);
            const plexLang = langCode === 'en' ? 'eng' : (langCode === 'es' ? 'spa' : langCode);
            const coverage = sub.coverage ? ` [${sub.coverage}]` : '';
            const variant = (sub.language === 'sp' || sub.language === 'SP') ? ' (SP)' : '';
            const targetTitle = `${sub.author || 'Local'}${coverage}${variant}`;

            // 2. Find and delete duplicates
            const duplicates = existingStreams.filter(s => {
                if (deletedIds.has(s.id)) return false;
                
                const sTitle = s.title || s.extendedDisplayTitle || '';
                const isUnknown = !s.languageCode || s.languageCode === 'und';
                const titleMatch = sTitle.includes(targetTitle) || sTitle === 'Local' || sTitle === '';
                
                // Only match if the language also matches (to avoid deleting Spanish when processing English)
                // or if it's one of those broken 'Unknown' tracks
                const langMatch = s.languageCode === plexLang || isUnknown;
                
                return titleMatch && langMatch;
            });

            if (duplicates.length > 0) {
                console.log(`[EncoraService] Removing ${duplicates.length} duplicate/broken streams for "${targetTitle}" (${plexLang})`);
                for (const dupe of duplicates) {
                    const deleted = await this.plexService.deleteStream(dupe.id);
                    if (deleted) {
                        deletedIds.add(dupe.id);
                        console.log(`[EncoraService] Successfully removed old stream ID ${dupe.id} (${dupe.languageCode || 'unknown'})`);
                    }
                }
            }

            // 3. Upload fresh copy
            await this.plexService.uploadSubtitle(ratingKey, sub.path, langCode, targetTitle);
        }
    }
}
