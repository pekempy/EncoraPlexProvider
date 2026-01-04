# NFO Fallback Feature

## Overview

The Encora Plex Provider now supports NFO files as a fallback when Encora matching fails. This allows you to use local NFO metadata files for items that aren't available in the Encora database.

## How It Works

The matching process follows this priority:

1. **Encora ID Matching**: If an Encora ID is found (via GUID, title tag like `{e-12345}`, or filename), the system attempts to match against the Encora API
2. **Encora Title Search**: If no ID is found, the system searches Encora by title
3. **NFO Fallback**: If no Encora results are found and a filename is provided, the system looks for an NFO file and parses it

## NFO File Format

The NFO parser supports standard Kodi/Plex NFO XML format. Here's an example:

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<movie>
   <title>Cinderella (Andrew Lloyd Webber) (West End - 2022-02-xx)</title>
   <originaltitle>Cinderella</originaltitle>
   <sorttitle>Cinderella</sorttitle>
   <thumb aspect="poster">https://example.com/poster.jpg</thumb>
   <premiered>2022-02-01</premiered>
   <releasedate>2022-02-01</releasedate>
   <director>RhythmInMe</director>
   <genre>Bootleg</genre>
   <genre>Musical</genre>
   <year>2022</year>
   <studio>West End</studio>
   <plot>Welcome to Belleville! The most aggressively picturesque town...</plot>
   <certification>UK:NFT</certification>
   <certification>US:NFT</certification>
   
   <actor>
       <name>Carrie Hope Fletcher</name>
       <role>Cinderella</role>
       <thumb>https://stagemedia.me/storage/headshots/example.jpg</thumb>
       <type>Actor</type>
   </actor>
   <actor>
       <name>Michael Hamway</name>
       <role>u/s Prince Sebastian</role>
       <thumb>https://stagemedia.me/storage/headshots/example2.jpg</thumb>
       <type>Actor</type>
   </actor>
</movie>
```

## Supported NFO Fields

The NFO parser extracts the following fields:

### Basic Information
- `<title>` - Main title (required)
- `<originaltitle>` - Original title
- `<sorttitle>` - Sort title
- `<year>` - Release year
- `<premiered>` - Premiere date (YYYY-MM-DD)
- `<releasedate>` - Release date (YYYY-MM-DD)
- `<plot>` - Summary/description

### Media Information
- `<director>` - Director name (mapped to Director field)
- `<studio>` - Studio/venue name
- `<genre>` - Genre tags (can have multiple)
- `<certification>` - Content ratings (can have multiple)

### Images
- `<thumb>` - Poster image URL

### Cast
- `<actor>` blocks containing:
  - `<name>` - Actor name
  - `<role>` - Character/role name
  - `<thumb>` - Actor headshot URL

## NFO File Location

The parser looks for NFO files in the following order:

1. **Same name as video file**: If your video is `movie.mkv`, it looks for `movie.nfo`
2. **movie.nfo**: In the same directory as the video file
3. **Any .nfo file**: If neither of the above are found, it will use the first `.nfo` file found in the same directory

## Example Usage

### Scenario 1: Video with matching NFO
```
/path/to/movies/
  ├── Cinderella (2022-02-01).mkv
  └── Cinderella (2022-02-01).nfo
```

When Plex scans this file and Encora has no match, the NFO will be automatically parsed and used.

### Scenario 2: Using movie.nfo
```
/path/to/movies/Cinderella/
  ├── movie.mkv
  └── movie.nfo
```

### Scenario 3: Any NFO file in directory
```
/path/to/movies/Cinderella/
  ├── video.mkv
  └── metadata.nfo
```

In this case, `metadata.nfo` will be used since there's no matching `video.nfo` or `movie.nfo`.

## Metadata Mapping

NFO fields are mapped to Plex metadata as follows:

| NFO Field | Plex Field | Notes |
|-----------|------------|-------|
| `title` | `title` | Main title |
| `originaltitle` | `originalTitle` | Original title |
| `sorttitle` | `titleSort` | Sort title |
| `year` | `year` | Release year |
| `premiered` / `releasedate` | `originallyAvailableAt` | Air/release date |
| `plot` | `summary` | Description |
| `director` | `Director` | Director array |
| `studio` | `studio` and `Studio` | Studio name |
| `genre` | `Genre` | Genre array |
| `thumb` | `thumb` and `Image` | Poster image |
| `actor` | `Role` | Cast array with roles |

## Testing

The NFO parser includes comprehensive tests. Run them with:

```bash
npm test -- NfoParser.test.ts
```

## Limitations

- The NFO parser uses simple regex-based XML parsing (not a full XML parser)
- Only supports movie metadata (not TV shows/episodes)
- NFO files must be in UTF-8 encoding
- The parser is designed for standard Kodi/Plex NFO format

## Future Enhancements

Potential improvements for future versions:

- Support for TV show/episode NFO files
- More robust XML parsing using a dedicated library
- Support for additional NFO fields (ratings, collections, etc.)
- Caching of parsed NFO files for performance
