const ytdl = require('ytdl-core');

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

        const info = await ytdl.getInfo(url);
        const medias = [];

        info.formats.forEach(format => {
            const isVideo = format.hasVideo;
            const isAudio = format.hasAudio;
            
            const media = {
                formatId: parseInt(format.itag),
                label: `${format.container} (${format.qualityLabel || format.audioBitrate + 'kbps'})`,
                type: isVideo ? 'video' : 'audio',
                ext: format.container,
                quality: format.qualityLabel || format.audioBitrate + 'kbps',
                width: format.width || null,
                height: format.height || null,
                url: format.url,
                bitrate: format.bitrate || null,
                fps: format.fps || null,
                audioQuality: isAudio ? (format.audioBitrate > 100 ? 'AUDIO_QUALITY_MEDIUM' : 'AUDIO_QUALITY_LOW') : null,
                audioSampleRate: format.audioSampleRate || null,
                mimeType: format.mimeType,
                duration: parseInt(info.videoDetails.lengthSeconds),
                is_audio: isAudio,
                extension: format.container
            };
            medias.push(media);
        });

        const response = {
            url: url,
            source: 'youtube',
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            thumbnail: info.videoDetails.thumbnails[0].url,
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