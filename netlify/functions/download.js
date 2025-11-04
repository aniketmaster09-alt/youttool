    const ytdl = require('@distube/ytdl-core');

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

            if (!ytdl.validateURL(url)) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Invalid YouTube URL format' })
                };
            }

            const agent = ytdl.createAgent([
                {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Cache-Control': 'max-age=0'
                }
            ]);

            const sessionId = Math.random().toString(36).substring(2, 15);
            const visitorId = Math.random().toString(36).substring(2, 22);
            const timestamp = Math.floor(Date.now() / 1000);
            
            const info = await ytdl.getInfo(url, {
                agent,
                requestOptions: {
                    transform: (parsed) => {
                        return Object.assign(parsed, {
                            headers: Object.assign(parsed.headers, {
                                'Cookie': `CONSENT=YES+shp.gws-20240731-0_RC1.en+FX+${Math.floor(Math.random() * 999)}; VISITOR_INFO1_LIVE=${visitorId}; YSC=${sessionId}; PREF=f1=50000000&f6=40000000&hl=en&gl=US&f4=4000000; GPS=1; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg; __Secure-3PSIDCC=AKEyXzWxK-${Math.random().toString(36).substring(2, 15)}; LOGIN_INFO=AFmmF2swRQIhAK${Math.random().toString(36).substring(2, 15)}; ${cookieString}; _ga=GA1.1.584190117.1762224553; _ga_2HS60D2GS7=GS2.1.s1762224553$o1$g1$t${timestamp}$j50$l0$h0`,
                                'X-YouTube-Client-Name': '1',
                                'X-YouTube-Client-Version': '2.20241105.01.00',
                                'X-Goog-Visitor-Id': visitorId,
                                'X-Origin': 'https://www.youtube.com',
                                'Origin': 'https://www.youtube.com',
                                'Referer': 'https://www.youtube.com/',
                                'Sec-Ch-Ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
                                'Sec-Ch-Ua-Mobile': '?0',
                                'Sec-Ch-Ua-Platform': '"Windows"'
                            })
                        });
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