const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const execAsync = promisify(exec);

exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { url } = JSON.parse(event.body);
        
        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid YouTube URL' })
            };
        }

        const cookiesPath = path.join(process.cwd(), 'cookies', 'cookies.txt');
        const { stdout } = await execAsync(`yt-dlp --cookies "${cookiesPath}" -J "${url}"`);
        const info = JSON.parse(stdout);
        const medias = [];

        // Process all formats
        info.formats.forEach(format => {
            if (format.url) {
                const isVideo = format.vcodec && format.vcodec !== 'none';
                const isAudio = format.acodec && format.acodec !== 'none';
                
                const media = {
                    itag: format.format_id,
                    ext: format.ext,
                    resolution: format.resolution || null,
                    fps: format.fps || null,
                    filesizeMB: format.filesize ? Math.round(format.filesize / (1024 * 1024) * 100) / 100 : "?",
                    tbr: format.tbr || null,
                    vcodec: format.vcodec || null,
                    acodec: format.acodec || null,
                    url: format.url,
                    // Keep existing fields for compatibility
                    formatId: parseInt(format.format_id),
                    type: isVideo ? 'video' : 'audio',
                    quality: `${format.ext} (${format.height ? format.height + 'p' : format.abr ? format.abr + 'kb/s' : 'audio'})`,
                    is_audio: isAudio
                };
                medias.push(media);
            }
        });

        const response = {
            url: url,
            source: 'youtube',
            title: info.title,
            author: info.uploader || '',
            thumbnail: info.thumbnail,
            duration: Math.round(info.duration),
            medias: medias,
            type: 'multiple',
            error: false,
            time_end: Date.now() % 1000
        };

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: true,
                message: error.message 
            })
        };
    }
};
