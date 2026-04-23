import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

export interface LocalSubtitle {
  path: string;
  name: string;
  language?: string;
  author?: string;
  coverage?: string;
}

export class FileSystemService {
  /**
   * Finds the recording directory by its ID {e-ID}
   */
  public findRecordingDirectory(recordingId: number): string | null {
    const basePath = config.plex.libraryBasePath;
    if (!basePath || !fs.existsSync(basePath)) {
      return null;
    }

    const idPattern = `{e-${recordingId}}`;
    const idPatternAlt = `{e ${recordingId}}`;

    // Simple one-level deep scan for now to avoid massive recursion
    // The user's example is in /srv/plex/Plex/Theatre/
    // So we might need to scan subdirectories
    return this.searchDirectoryRecursive(basePath, idPattern, idPatternAlt, 2);
  }

  /**
   * Recursively search for a directory containing the ID pattern
   */
  private searchDirectoryRecursive(
    currentPath: string, 
    pattern: string, 
    patternAlt: string, 
    maxDepth: number, 
    currentDepth: number = 0
  ): string | null {
    if (currentDepth > maxDepth) return null;

    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });
      
      // Check current level first
      for (const item of items) {
        if (item.isDirectory()) {
          if (item.name.toLowerCase().includes(pattern.toLowerCase()) || 
              item.name.toLowerCase().includes(patternAlt.toLowerCase())) {
            return path.join(currentPath, item.name);
          }
        }
      }

      // Recurse
      for (const item of items) {
        if (item.isDirectory() && !item.name.startsWith('.')) {
          const found = this.searchDirectoryRecursive(
            path.join(currentPath, item.name), 
            pattern, 
            patternAlt, 
            maxDepth, 
            currentDepth + 1
          );
          if (found) return found;
        }
      }
    } catch (err) {
      console.error(`Error scanning directory ${currentPath}:`, err);
    }

    return null;
  }

  /**
   * Finds all subtitle files in a directory
   */
  public findSubtitles(directoryPath: string): LocalSubtitle[] {
    const subtitles: LocalSubtitle[] = [];
    try {
      const items = fs.readdirSync(directoryPath);
      for (const item of items) {
        const lowerItem = item.toLowerCase();
        // Support common text formats + VobSub (idx/sub)
        const isSub = lowerItem.endsWith('.srt') || 
                      lowerItem.endsWith('.vtt') || 
                      lowerItem.endsWith('.ass') || 
                      lowerItem.endsWith('.ssa') ||
                      lowerItem.endsWith('.idx') ||
                      lowerItem.endsWith('.sub');

        if (isSub) {
          const info = this.parseSubtitleInfo(item);
          subtitles.push({
            path: path.join(directoryPath, item),
            name: item,
            language: info.language,
            author: info.author,
            coverage: info.coverage
          });
        }
      }
    } catch (err) {
      console.error(`Error finding subtitles in ${directoryPath}:`, err);
    }
    return subtitles;
  }

  /**
   * Parses naming convention: Author [Coverage] {Hash}.lang.ext
   */
  private parseSubtitleInfo(filename: string): { author?: string, coverage?: string, language?: string } {
    const info: any = {};
    
    // 1. Language detection (standard Plex .lang.ext)
    const parts = filename.split('.');
    if (parts.length >= 3) {
      const langCode = parts[parts.length - 2].toLowerCase();
      if (langCode.length === 2 || langCode.length === 3) {
        info.language = langCode;
      }
    }

    // 2. Author and Coverage detection
    const baseName = filename.split('.')[0];
    
    // Try to find [Coverage]
    const coverageMatch = baseName.match(/\[(.*?)\]/);
    if (coverageMatch) {
      info.coverage = coverageMatch[1];
    }

    // Improved Author detection:
    // If it contains [ or {, take everything before the first one
    if (baseName.includes('[') || baseName.includes('{')) {
        const authorMatch = baseName.match(/^(.*?)[\s\[{]/);
        if (authorMatch && authorMatch[1].trim()) {
            info.author = authorMatch[1].trim();
        }
    } else {
        // If it doesn't contain [ or {, it's likely just a filename matched to video
        // e.g. "Prima Facie - National Theatre at Home.en.srt"
        // In this case, we don't have an "Author" in the Encora sense, so we use 'Local'
        info.author = 'Local';
    }

    return info;
  }

  /**
   * Finds the primary video file in a directory
   */
  public findVideoFile(directoryPath: string): string | null {
    try {
      const items = fs.readdirSync(directoryPath);
      // Sort by size to find the largest file (most likely the video)
      const videoFiles = items.filter(item => {
        const ext = item.toLowerCase().split('.').pop();
        return ['mp4', 'mkv', 'avi', 'mov', 'ts', 'm4v'].includes(ext || '');
      }).map(item => ({
        name: item,
        size: fs.statSync(path.join(directoryPath, item)).size
      })).sort((a, b) => b.size - a.size);

      return videoFiles.length > 0 ? videoFiles[0].name : null;
    } catch (err) {
      console.error(`Error finding video file in ${directoryPath}:`, err);
      return null;
    }
  }

  /**
   * Downloads a subtitle from a URL and saves it to the local directory
   */
  public async downloadSubtitle(url: string, directoryPath: string, filename: string): Promise<string | null> {
    try {
      const axios = require('axios');
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const filePath = path.join(directoryPath, filename);
      
      fs.writeFileSync(filePath, response.data);
      console.log(`Successfully downloaded subtitle to: ${filePath}`);
      return filePath;
    } catch (err) {
      console.error(`Failed to download subtitle from ${url}:`, err);
      return null;
    }
  }

  /**
   * Finds an NFO file in the same directory as the media file
   */
  public findNfoFile(mediaPath: string): string | null {
    const directory = path.dirname(mediaPath);
    if (!fs.existsSync(directory)) return null;

    try {
      const items = fs.readdirSync(directory);
      
      // 1. Look for movie.nfo
      if (items.some(i => i.toLowerCase() === 'movie.nfo')) {
        return path.join(directory, items.find(i => i.toLowerCase() === 'movie.nfo')!);
      }

      // 2. Look for [filename].nfo
      const filename = path.basename(mediaPath, path.extname(mediaPath));
      if (items.some(i => i.toLowerCase() === `${filename.toLowerCase()}.nfo`)) {
        return path.join(directory, items.find(i => i.toLowerCase() === `${filename.toLowerCase()}.nfo`)!);
      }

      // 3. Look for any .nfo file (fallback)
      const nfoFiles = items.filter(i => i.toLowerCase().endsWith('.nfo'));
      if (nfoFiles.length > 0) {
        return path.join(directory, nfoFiles[0]);
      }
    } catch (err) {
      console.error(`Error finding NFO in ${directory}:`, err);
    }

    return null;
  }
}
