

# PlexDL (Alpha)

**PlexDL** is a Chrome extension that adds a download button to media items in the Plex web interface, allowing you to save episodes, seasons, or entire shows directly to your local drive.
This project is partly based on the work of PipLongRun.

## Features

- Injects a “Download” button next to the default Play button on Plex media pages.
- Supports recursive traversal of shows → seasons → episodes via XML parsing.
- Utilizes a single `content.js` script for UI, token handling, XML fetching, and download logic.
- Uses `background.js` and Chrome’s `downloads` API for direct file saving.
- Maintains original file names and extensions.

## Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/plexdl-extension.git
   cd plexdl-extension
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select this project’s root directory.

## Usage

1. Open the Plex web app at `https://app.plex.tv/desktop` (or other `*.plex.tv`/`*.plex.direct` URLs).
2. Navigate to a show, season, or episode page.
3. Click the **Download** button that appears next to **Play**.
4. Downloaded files will appear in your default downloads folder.

**Note:** Chrome queues up to 6 simultaneous connections per host; additional downloads wait in queue.

## File Structure

```
manifest.json       # Chrome extension manifest
background.js       # Service worker handling chrome.downloads calls
content.js          # Single content script with all download logic
styles.css          # Optional CSS overrides
README.md           # This documentation
```

## How It Works

- **content.js**:
  - Retrieves Plex access token from `localStorage`.
  - Parses Plex resource XML to get `baseUri` and `accessToken`.
  - Fetches media metadata XML and invokes `downloadRecursive`.
  - `downloadRecursive`:
    1. If `<Directory>` elements are present, follows `/children` links recursively.
    2. If `<Video>` elements are present, sends download messages for each episode.
    3. Otherwise, downloads the single media part.
- **background.js**: Listens for `PLEXDL_DOWNLOAD` messages and calls `chrome.downloads.download` with the URL and filename.

## Development & Testing

- After any change to `content.js` or `background.js`, reload the unpacked extension in `chrome://extensions`.
- Refresh your Plex tab to see changes take effect.
- Use Chrome's Developer Tools console to inspect `[PlexDL]` logs.

## Contributing

Contributions are welcome! Please open issues or submit pull requests.

## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.