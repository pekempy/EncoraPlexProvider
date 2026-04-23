/**
 * Maps Encora API responses to Plex Metadata models
 */

import {
    MovieMetadata,
    Image,
    Person,
    Genre,
    Subtitle,
    Media,
} from '../models/Metadata';
import { EncoraRecording, EncoraSubtitle } from '../types/encora';
import { StageMediaResponse } from '../services/StageMediaClient';
import { MOVIE_PROVIDER_IDENTIFIER } from '../providers/MovieProvider';
import { constructMetadataKey, constructGuid, createExternalGuid } from '../utils/guid';
import { config } from '../config/env';

export class EncoraMapper {

    /**
     * Map Encora Recording to Plex MovieMetadata
     */
    mapRecording(
        recording: EncoraRecording,
        stageMediaImages?: StageMediaResponse,
        subtitles?: EncoraSubtitle[],
        filename?: string
    ): MovieMetadata {
        const ratingKey = `encora-recording-${recording.id}`;

        // Create performer URL map
        const performerUrlMap: Record<number, string> = {};
        if (stageMediaImages?.performers) {
            for (const performer of stageMediaImages.performers) {
                performerUrlMap[performer.id] = performer.url;
            }
        }

        // Map cast
        const roles: Person[] = recording.cast.map(member => {
            const url = performerUrlMap[member.performer.id] || member.performer.url;
            return {
                tag: member.performer.name,
                role: member.character.name,
                thumb: url || "https://i.ibb.co/xSHDBZDp/c-Xq-YZEu.png", // Default placeholder if no image
            };
        });

        // Determine content rating (NFT status)
        let contentRating: string | undefined = undefined;
        if (recording.nft) {
            if (recording.nft.nft_forever) {
                contentRating = 'NFT';
            } else if (recording.nft.nft_date) {
                const nftDate = new Date(recording.nft.nft_date);
                const now = new Date();
                if (nftDate > now) {
                    contentRating = 'NFT';
                }
            }
        }

        // Map genres
        const genres: Genre[] = [];
        if (recording.metadata.recording_type) {
            genres.push({ tag: recording.metadata.recording_type });
        }
        if (recording.metadata.media_type) {
            genres.push({ tag: recording.metadata.media_type });
        }

        // Map images (posters)
        const images: Image[] = [];
        if (stageMediaImages?.posters) {
            for (const posterUrl of stageMediaImages.posters) {
                images.push({
                    type: 'coverPoster',
                    url: posterUrl,
                    alt: recording.show
                });
            }
        }

        // Map subtitles helper
        const getSubtitleTitle = (sub: EncoraSubtitle) => {
            const author = sub.author === 'Local' ? 'Local' : sub.author;
            const coverage = sub.coverage ? ` [${sub.coverage}]` : '';
            return `${author}${coverage}`;
        };

        // Construct Media object for modern Plex agent support
        const media: Media[] = [];
        if (filename && subtitles && subtitles.length > 0) {
            const videoFilename = filename.split('/').pop() || filename;
            const baseName = videoFilename.substring(0, videoFilename.lastIndexOf('.')) || videoFilename;

            media.push({
                Part: [{
                    key: filename, // Use the exact key Plex sent us
                    file: filename.startsWith('/') ? filename : filename, // Keep absolute if provided
                    container: filename.split('.').pop()?.toLowerCase() || 'mp4',
                    Stream: (subtitles || []).map((sub, index) => ({
                        id: 1000 + index,
                        streamType: 3,
                        codec: sub.file_type.toLowerCase(),
                        language: this.mapLanguage(sub.language),
                        languageTag: this.mapLanguage(sub.language),
                        languageCode: this.mapLanguageCode(sub.language),
                        url: sub.url,
                        format: sub.file_type.toLowerCase(),
                        title: getSubtitleTitle(sub),
                        forced: sub.author === 'Forced',
                        transient: 1,
                        streamIdentifier: (1000 + index).toString(),
                        canAutoSync: 0
                    }))
                }]
            });
        }

        const metadata: any = {
            type: 'movie',
            ratingKey: ratingKey,
            key: constructMetadataKey(ratingKey),
            guid: constructGuid(MOVIE_PROVIDER_IDENTIFIER, 'movie', ratingKey),
            title: this.formatTitle(recording),
            contentRating,
            originalTitle: recording.tour ? `${recording.show} - ${recording.tour}` : undefined,
            originallyAvailableAt: recording.date.full_date,
            year: recording.date.full_date ? new Date(recording.date.full_date).getFullYear() : undefined,
            summary: this.sanitizeHtml(recording.metadata.show_description) || this.sanitizeHtml(recording.master_notes) || this.sanitizeHtml(recording.notes),
            studio: recording.tour,
            thumb: images.length > 0 ? images[0].url : undefined,
            art: undefined,
            Image: images.length > 0 ? images : undefined,
            Genre: genres.length > 0 ? genres : undefined,
            Subtitle: (subtitles || []).map((s, i) => ({
                id: 1000 + i,
                key: s.url, // Point to our proxy URL
                language: this.mapToFullName(s.language),
                languageTag: this.mapLanguage(s.language),
                languageCode: this.mapLanguageCode(s.language),
                format: s.file_type.toLowerCase(),
                forced: s.author === 'Forced',
                title: getSubtitleTitle(s)
            })),
            Role: roles.length > 0 ? roles : undefined,
            Actor: roles.length > 0 ? roles : undefined,
            Director: recording.master ? [{ tag: recording.master }] : undefined,
            editionTitle: recording.master ? recording.master : undefined,
            Guid: [
                { id: createExternalGuid('encora', recording.id.toString()) },
                { id: `tmdb://encora-${recording.id}` }
            ],
            Media: [
                {
                    id: 1,
                    Part: [{
                        id: 1,
                        Stream: (subtitles || []).map((sub, index) => ({
                            id: 1000 + index,
                            streamType: 3,
                            selected: true, // Priority flag
                            codec: sub.file_type.toLowerCase(),
                            language: this.mapLanguage(sub.language),
                            languageTag: this.mapLanguage(sub.language),
                            languageCode: this.mapLanguageCode(sub.language),
                            url: sub.url,
                            format: sub.file_type.toLowerCase(),
                            title: getSubtitleTitle(sub),
                            transient: 1
                        }))
                    }]
                }
            ],
            Studio: recording.metadata.venue ? [{ tag: recording.metadata.venue }] : undefined,
            Country: recording.metadata.city ? [{ tag: recording.metadata.city }] : undefined,
        };
        return metadata;
    }

    /**
     * Remove HTML tags from string
     */
    private sanitizeHtml(html: string | null | undefined): string | undefined {
        if (!html) return undefined;
        return html.replace(/<[^>]*>?/gm, '')
            .trim();
    }

    /**
     * Map full language name or code to ISO 639-1 code (2-letter)
     */
    public mapLanguage(language: string): string {
        if (!language) return 'und';

        const lang = language.toLowerCase().trim();

        // Direct mapping
        const langMap: Record<string, string> = {
            'english': 'en', 'en': 'en', 'eng': 'en',
            'french': 'fr', 'fr': 'fr', 'fra': 'fr', 'fre': 'fr',
            'spanish': 'es', 'es': 'es', 'spa': 'es', 'sp': 'es', 'spanish (latin)': 'es-419',
            'dutch': 'nl', 'nl': 'nl', 'nld': 'nl', 'dut': 'nl',
            'german': 'de', 'de': 'de', 'deu': 'de', 'ger': 'de',
            'italian': 'it', 'it': 'it', 'ita': 'it',
            'portuguese': 'pt', 'pt': 'pt', 'por': 'pt', 'portuguese (br)': 'pt-br',
            'japanese': 'ja', 'ja': 'ja', 'jpn': 'ja',
            'russian': 'ru', 'ru': 'ru', 'rus': 'ru',
            'czech': 'cs', 'cs': 'cs', 'cze': 'cs', 'ces': 'cs',
            'korean': 'ko', 'ko': 'ko', 'kor': 'ko',
            'hungarian': 'hu', 'hu': 'hu', 'hun': 'hu',
            'swedish': 'sv', 'sv': 'sv', 'swe': 'sv',
            'polish': 'pl', 'pl': 'pl', 'pol': 'pl',
            'danish': 'da', 'da': 'da', 'dan': 'da',
            'norwegian': 'no', 'no': 'no', 'nor': 'no',
            'finnish': 'fi', 'fi': 'fi', 'fin': 'fi',
            'hebrew': 'he', 'he': 'he', 'heb': 'he',
            'cantonese': 'zh', 'mandarin': 'zh', 'chinese': 'zh', 'zh': 'zh', 'chi': 'zh', 'zho': 'zh',
            'catalan': 'ca', 'ca': 'ca', 'cat': 'ca',
            'yiddish': 'yi', 'yi': 'yi', 'yid': 'yi',
            'american sign language': 'ase',
            'british sign language': 'bsl',
            'switzerland/german': 'gsw',
            'filipino': 'fil', 'tl': 'fil', 'tgl': 'fil',
            'croatian': 'hr', 'hr': 'hr', 'hrv': 'hr',
            'serbian': 'sr', 'sr': 'sr', 'srp': 'sr',
            'estonian': 'et', 'et': 'et', 'est': 'et',
            'latvian': 'lv', 'lv': 'lv', 'lav': 'lv',
            'lithuanian': 'lt', 'lt': 'lt', 'lit': 'lt',
            'romanian': 'ro', 'ro': 'ro', 'ron': 'ro', 'rum': 'ro',
            'greek': 'el', 'el': 'el', 'ell': 'el', 'gre': 'el',
            'turkish': 'tr', 'tr': 'tr', 'tur': 'tr',
            'slovak': 'sk', 'sk': 'sk', 'slk': 'sk', 'slo': 'sk',
            'bulgarian': 'bg', 'bg': 'bg', 'bul': 'bg',
            'scots': 'sco',
            'malay': 'ms', 'ms': 'ms', 'msa': 'ms', 'may': 'ms',
            'kazakh': 'kk', 'kk': 'kk', 'kaz': 'kk',
            'georgian': 'ka', 'ka': 'ka', 'kat': 'ka', 'geo': 'ka',
            'arabic (palestinian)': 'apc',
            'arabic': 'ar', 'ar': 'ar', 'ara': 'ar',
            'swahili': 'sw', 'sw': 'sw', 'swa': 'sw',
            'albanian': 'sq', 'sq': 'sq', 'sqi': 'sq', 'alb': 'sq',
            'macedonian': 'mk', 'mk': 'mk', 'mkd': 'mk', 'mac': 'mk',
            'ukrainian': 'uk', 'uk': 'uk', 'ukr': 'uk',
            'cornish': 'kw', 'kw': 'kw', 'cor': 'kw',
            'latin': 'la', 'la': 'la', 'lat': 'la',
            'armenian': 'hy', 'hy': 'hy', 'hye': 'hy', 'arm': 'hy',
            'icelandic': 'is', 'is': 'is', 'isl': 'is', 'ice': 'is'
        };

        return langMap[lang] || (lang.length === 2 ? lang : 'und');
    }

    /**
     * Map language to 3-letter code for Plex compatibility
     */
    private mapLanguageCode(language: string): string {
        const iso1 = this.mapLanguage(language);
        const map: Record<string, string> = {
            'en': 'eng', 'fr': 'fra', 'es': 'spa', 'nl': 'nld', 'de': 'deu', 'it': 'ita',
            'pt': 'por', 'pt-br': 'por', 'ja': 'jpn', 'ru': 'rus', 'cs': 'ces', 'ko': 'kor',
            'hu': 'hun', 'sv': 'swe', 'pl': 'pol', 'da': 'dan', 'no': 'nor', 'fi': 'fin',
            'he': 'heb', 'zh': 'zho', 'ca': 'cat', 'yi': 'yid', 'es-419': 'spa',
            'hr': 'hrv', 'sr': 'srp', 'et': 'est', 'lv': 'lav', 'lt': 'lit', 'ro': 'ron',
            'el': 'ell', 'tr': 'tur', 'sk': 'slk', 'bg': 'bul', 'ms': 'msa', 'kk': 'kaz',
            'ka': 'kat', 'ar': 'ara', 'sw': 'swa', 'sq': 'sqi', 'mk': 'mkd', 'uk': 'ukr',
            'kw': 'cor', 'la': 'lat', 'hy': 'hye', 'is': 'isl', 'fil': 'fil', 'ase': 'ase', 'bsl': 'bsl'
        };
        return map[iso1] || 'und';
    }

    /**
     * Map to full display name
     */
    private mapToFullName(language: string): string {
        const iso1 = this.mapLanguage(language);
        const map: Record<string, string> = {
            'en': 'English', 'fr': 'French', 'es': 'Spanish', 'nl': 'Dutch', 'de': 'German',
            'it': 'Italian', 'pt': 'Portuguese', 'pt-br': 'Portuguese (BR)', 'ja': 'Japanese',
            'ru': 'Russian', 'cs': 'Czech', 'ko': 'Korean', 'hu': 'Hungarian', 'sv': 'Swedish',
            'pl': 'Polish', 'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'he': 'Hebrew',
            'zh': 'Chinese', 'ca': 'Catalan', 'yi': 'Yiddish', 'es-419': 'Spanish (Latin)',
            'hr': 'Croatian', 'sr': 'Serbian', 'et': 'Estonian', 'lv': 'Latvian', 'lt': 'Lithuanian',
            'ro': 'Romanian', 'el': 'Greek', 'tr': 'Turkish', 'sk': 'Slovak', 'bg': 'Bulgarian',
            'ms': 'Malay', 'kk': 'Kazakh', 'ka': 'Georgian', 'ar': 'Arabic', 'sw': 'Swahili',
            'sq': 'Albanian', 'mk': 'Macedonian', 'uk': 'Ukrainian', 'kw': 'Cornish',
            'la': 'Latin', 'hy': 'Armenian', 'is': 'Icelandic', 'fil': 'Filipino',
            'ase': 'American Sign Language', 'bsl': 'British Sign Language', 'gsw': 'Switzerland/German',
            'apc': 'Arabic (Palestinian)', 'sco': 'Scots'
        };
        return map[iso1] || language;
    }

    /**
     * Format title based on configuration template
     */
    private formatTitle(recording: EncoraRecording): string {
        try {
            const format = config.formatting.titleFormat;
            const replaceChar = config.formatting.dateReplaceChar;

            // Date parsing
            const dateObj = recording.date;
            let year = '????';
            let month = '??';
            let day = '??';

            if (dateObj.full_date) {
                const parts = dateObj.full_date.split('-');
                if (parts.length === 3) {
                    year = parts[0];
                    month = dateObj.month_known ? parts[1] : replaceChar.repeat(2);
                    day = dateObj.day_known ? parts[2] : replaceChar.repeat(2);
                }
            }

            // Month names for {{date}} text format
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"];

            let dateText = "";
            let dateIsoValue = `${year}-${month}-${day}`;
            let dateUsa = `${month}-${day}-${year}`;
            let dateNumeric = `${day}-${month}-${year}`;

            if (dateObj.month_known) {
                const mIndex = parseInt(month, 10) - 1;
                const mName = (mIndex >= 0 && mIndex < 12) ? monthNames[mIndex] : "Unknown";
                dateText += mName;
            } else {
                dateText += replaceChar.repeat(3);
            }

            dateText += " ";
            dateText += day;
            dateText += ", ";
            dateText += year;

            let title = format;
            title = title.replace(/{{show}}/g, recording.show || '');
            title = title.replace(/{{tour}}/g, recording.tour || '');
            title = title.replace(/{{master}}/g, recording.master || '');
            title = title.replace(/{{date}}/g, dateText);
            title = title.replace(/{{date_iso}}/g, dateIsoValue);
            title = title.replace(/{{date_usa}}/g, dateUsa);
            title = title.replace(/{{date_numeric}}/g, dateNumeric);

            return title.trim();

        } catch (e) {
            console.error('Error formatting title:', e);
            return recording.show; // Fallback
        }
    }
}
