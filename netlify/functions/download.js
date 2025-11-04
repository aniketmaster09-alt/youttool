const ytdl = require('@distube/ytdl-core');

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

        if (!ytdl.validateURL(url)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid YouTube URL format' })
            };
        }

        const info = await ytdl.getInfo(url, {
            requestOptions: {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            }
        });
        const medias = [];

        info.formats.forEach(format => {
            if (!format.url) return;
            
            const isVideo = format.hasVideo;
            const isAudio = format.hasAudio;
            
            const media = {
                formatId: parseInt(format.itag),
                label: `${format.container || 'unknown'} (${format.qualityLabel || (format.audioBitrate ? format.audioBitrate + 'kbps' : 'audio')})`,
                type: isVideo ? 'video' : 'audio',
                ext: format.container || 'mp4',
                quality: format.qualityLabel || (format.audioBitrate ? format.audioBitrate + 'kbps' : 'audio'),
                width: format.width || null,
                height: format.height || null,
                url: format.url,
                bitrate: format.bitrate || format.audioBitrate || null,
                fps: format.fps || null,
                audioQuality: isAudio ? (format.audioBitrate > 100 ? 'AUDIO_QUALITY_MEDIUM' : 'AUDIO_QUALITY_LOW') : null,
                audioSampleRate: format.audioSampleRate ? format.audioSampleRate.toString() : null,
                mimeType: format.mimeType || `${isVideo ? 'video' : 'audio'}/${format.container || 'mp4'}`,
                duration: parseInt(info.videoDetails.lengthSeconds),
                is_audio: isAudio,
                extension: format.container || 'mp4'
            };
            medias.push(media);
        });

        const response = {
            url: url,
            source: 'youtube',
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            thumbnail: info.videoDetails.thumbnails?.[0]?.url || '',
            duration: parseInt(info.videoDetails.lengthSeconds),
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