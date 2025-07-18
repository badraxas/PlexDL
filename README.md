

# PlexDL (Alpha)

**PlexDL** is a Chrome extension that adds a download button to media items in the Plex web interface, allowing you to save episodes, seasons, or entire shows directly to your local drive.  
This project is partly based on the work of PipLongRun.  
This repository serves as a proof of concept. I'm working on a more robust, modular version that will be released soon.  

> 🇫🇷 The project was originally created for my dad (in France) to make backups from my selfhosted Plex server.
> 
> I wrote a full article (in French) explaining the motivation and how it works:  
> [Read it on LabDuGeek.fr](https://www.labdugeek.fr/plexdl-lextension-chrome-pour-le-telechargement-des-films-plex/)


## Features

- Injects a “Download” button next to the default Play button on Plex media pages.
- Supports recursive traversal of shows → seasons → episodes via XML parsing.
- Utilizes a single `content.js` script for UI, token handling, XML fetching, and download logic.
- Uses `background.js` and Chrome’s `downloads` API for direct file saving.
- Maintains original file names and extensions.

## Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/badraxas/PlexDL.git
   cd PlexDL
   ```
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top right).
4. Click **Load unpacked** and select this project’s root directory.

## Usage

1. Open the Plex web app at `https://app.plex.tv`
2. Navigate to a show, season, or episode page.
3. Click the **Download** button that appears next to **Play**.
4. Downloaded files will appear in your default downloads folder.

**Note:** Chrome queues up to six simultaneous connections per host; additional downloads wait in the queue and cannot be cleared quickly. There are two ways to address this:
- Suspend the download and remove it in the browser's Downloads center.
- Delete all the `.crdownload` files in your download directory as new files appear.

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