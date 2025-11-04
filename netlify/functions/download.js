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

            // Try with different options to bypass bot detection
            let info;
            try {
                // First attempt with basic options
                info = await play.video_info(url, { htmldata: false });
            } catch (err1) {
                try {
                    // Second attempt with different settings
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Add delay
                    info = await play.video_info(url, { htmldata: true });
                } catch (err2) {
                    // Third attempt - extract video ID and try different URL format
                    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
                    if (videoId) {
                        const altUrl = `https://www.youtube.com/watch?v=${videoId}`;
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        info = await play.video_info(altUrl);
                    } else {
                        throw new Error('Unable to extract video information. YouTube may be blocking requests.');
                    }
                }
            }
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
            // If YouTube is blocking, return a helpful message instead of error
            if (error.message.includes('Sign in to confirm')) {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        url: url,
                        source: 'youtube',
                        title: 'YouTube Video (Bot Detection Active)',
                        author: 'YouTube',
                        thumbnail: 'https://via.placeholder.com/480x360?text=YouTube+Bot+Detection',
                        duration: 0,
                        medias: [{
                            formatId: 999,
                            label: 'Direct YouTube Link',
                            type: 'video',
                            ext: 'mp4',
                            quality: 'Visit YouTube directly',
                            width: null,
                            height: null,
                            url: url,
                            bitrate: null,
                            fps: null,
                            audioQuality: null,
                            audioSampleRate: null,
                            mimeType: 'video/mp4',
                            duration: 0,
                            is_audio: false,
                            extension: 'mp4'
                        }],
                        type: 'multiple',
                        error: false,
                        message: 'YouTube is currently blocking automated requests. Please visit the video directly on YouTube.',
                        time_end: Date.now() % 1000
                    })
                };
            }
            
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
