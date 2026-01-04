# Encora Plex Provider

A custom Plex metadata agent for [Encora.it](https://encora.it) recordings. This agent provides metadata, cast photos (from [StageMedia](https://stagemedia.me)), posters (from [StageMedia](https://stagemedia.me)), subtitles, and customizable title formatting for your Encora collection in Plex.

This is different to the legacy Python agent, as it's a constantly running service which Plex queries for metadata. It must either be ran locally to the Plex Server, or be exposed to the Plex server via a reverse proxy.

## Features

- **Metadata**: Fetches show information, cast, directors, genres, and more from Encora
- **StageMedia Integration**: High-quality cast photos and posters via StageMedia API
- **Subtitle Support**: Automatic subtitle fetching with 50+ language mappings to ISO codes
- **NFT Status**: Displays NFT status as content rating
- **ID-Based Search**: Search by Encora recording ID (e.g., `15004`)
- **Customizable Titles**: Configure title format via environment variables

## Future Features

- **NFO Support**: Supporting NFO files for shows which are not on Encora
- **Customisable Settings**: Set API keys and other settings via Plex's metadata agent interface rather than .env

## Prerequisites

- Node.js ≥ v16
- npm
- Encora API key
- StageMedia API key
- Plex Media Server ≥ Version 1.43.0

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/pekempy/EncoraPlexProvider.git
   cd EncoraPlexProvider
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
    # Server Configuration
    PORT=3000
    BASE_URL=http://localhost:3000

    LOG_LEVEL=info  # Log level: error, warn, info, http, verbose, debug, silly (default: info)

    ### API Keys ###

    ENCORA_API_KEY=
    STAGEMEDIA_API_KEY=


    ### CUSTOMISATION OPTIONS###

    # {{show}}          - Title of the Show
    # {{tour}}          - Tour Name
    # {{date}}          - MONTH DD, YYYY
    # {{date_iso}}      - YYYY-MM-DD
    # {{date_usa}}      - MM-DD-YYYY
    # {{date_numeric}}  - DD-MM-YYYY
    # {{master}}        - Master of the recording

    TITLE_FORMAT="{{show}} ({{tour}}) {{date}}"
    DATE_REPLACE_CHAR="x"
   ```

## Running the Agent

### Development Mode
```bash
npm start
```

### Production Mode
```bash
npm run build
npm run serve
```

### Running Tests
```bash
npm test
```

The provider will start on `http://localhost:3000` (or the port specified in your `.env`).

## Plex Configuration

1. **Add the provider to Plex**
   
   In Plex Settings, go to Settings → `Metadata Agents` → `Add Provider` and add a custom provider with the following URL:
   ```
   http://localhost:3000/movie
   ```

    N.B. If the `Metadata Agents` does not appear, ensure you're running ≥ Version 1.43.0 of Plex.

2. **Add an Agent using this Provider**
   Below the Metadata Providers section, click `Add Agent`, and name it Encora, with the above provider as a metadata agent.
   
3. **Configure your library**
   
   - Create or edit a Movie library
   - Set the agent to "Encora" (or whatever you named it above)

4. **Matching content**
   
   The agent supports multiple matching methods:
   - **By ID**: Include the Encora recording ID in your filename    
       For example: `[2018-11-__] 42nd Street ~ pro-shot {e-15004}`    
       The `{e-15004}` is the most important part, as this is what will be used for auto-matching.    

## API Endpoints

- `GET /movie` - Provider definition
- `GET /movie/library/metadata/{ratingKey}` - Get metadata for a specific item
- `GET /movie/library/metadata/{ratingKey}/images` - Get all images for an item
- `POST /movie/library/metadata/matches` - Match/search for content
- `GET /api-docs` - Swagger API documentation


## Troubleshooting

### Agent not appearing in Plex
- Ensure the agent is running (`npm start`)
- Check that the URL is correct and accessible from your Plex server
- Verify firewall settings allow connections to port 3000

### No metadata appearing
- Check the console logs for API errors
- Verify your Encora and StageMedia API keys are valid
- Ensure the recording ID is correct

### Subtitles not showing
- Confirm the recording has subtitles on Encora
- Check the language mapping in `src/mappers/EncoraMapper.ts`


## Thanks to
- Encora: [encora.it](https://encora.it)
- StageMedia: [stagemedia.me](https://stagemedia.me)
- Plex TMDB Example Provider: [plex-tmdb-example-provider](https://github.com/plexinc/plex-tmdb-example-provider)
