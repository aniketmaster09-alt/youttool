    const play = require('play-dl');

    exports.handler = async (event, context) => {
        const origin = event.headers.origin || event.headers.Origin || '*';
        const headers = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Headers': 'Content-Type, User-Agent',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Credentials': 'true'
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
            
            // Extract cookies from request headers
            const requestCookies = event.headers.cookie || '';
            const gaCookies = requestCookies.match(/_ga[^;]*/g) || [];
            const cookieString = gaCookies.join('; ');
            
            if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid YouTube URL' })
                };
            }

            if (!play.yt_validate(url)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid YouTube URL format' })
                };
            }

            const info = await play.video_info(url);
            const medias = [];

            const formats = info.format;
            
            formats.forEach(format => {
                if (!format.url) return;
                
                const isVideo = format.hasVideo !== false;
                const isAudio = format.hasAudio !== false;
                
                const media = {
                    formatId: parseInt(format.itag || Math.random() * 1000),
                    label: `${format.container || 'mp4'} (${format.quality || 'unknown'})`,
                    type: isVideo ? 'video' : 'audio',
                    ext: format.container || 'mp4',
                    quality: format.quality || 'unknown',
                    width: format.width || null,
                    height: format.height || null,
                    url: format.url,
                    bitrate: format.bitrate || null,
                    fps: format.fps || null,
                    audioQuality: isAudio ? 'AUDIO_QUALITY_MEDIUM' : null,
                    audioSampleRate: null,
                    mimeType: `${isVideo ? 'video' : 'audio'}/${format.container || 'mp4'}`,
                    duration: parseInt(info.video_details.durationInSec),
                    is_audio: isAudio,
                    extension: format.container || 'mp4'
                };
                medias.push(media);
            });

            const response = {
                url: url,
                source: 'youtube',
                title: info.video_details.title,
                author: info.video_details.channel?.name || '',
                thumbnail: info.video_details.thumbnails?.[0]?.url || '',
                duration: parseInt(info.video_details.durationInSec),
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
