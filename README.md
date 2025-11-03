# YouTube Downloader

YouTube video downloader with thumbnail display and organized format categories.

## Features
- Video thumbnail and metadata display
- Organized format categories (Videos with Audio, Videos only, Audio only)
- All available formats from yt-dlp
- Direct download links

## Deploy to Netlify

1. Push this repository to GitHub
2. Connect GitHub repo to Netlify
3. Deploy automatically

## Files
- `index.html` - Frontend interface
- `netlify/functions/download.js` - Serverless function using yt-dlp
- `netlify.toml` - Netlify configuration
- `package.json` - Dependencies

## Usage
1. Enter YouTube URL
2. Click "Get Formats"
3. View video info and available formats
4. Click any format to download