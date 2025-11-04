const chromium = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

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

    let browser = null;
    try {
        const { url } = JSON.parse(event.body);
        
        if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid YouTube URL' })
            };
        }

        // Launch browser with chrome-aws-lambda
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true
        });

        const page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('video', { timeout: 15000 });

        const videoInfo = await page.evaluate(() => {
            const title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent?.trim() || 'Unknown Title';
            const author = document.querySelector('#owner-name a')?.textContent?.trim() || 'Unknown Author';
            const thumbnail = document.querySelector('meta[property="og:image"]')?.content;
            const video = document.querySelector('video');
            const duration = video ? Math.floor(video.duration) || 0 : 0;
            
            return { title, author, thumbnail, duration };
        });

        // Mock formats for demo
        const medias = [
            {
                itag: '18',
                ext: 'mp4',
                resolution: '640x360',
                fps: 30,
                filesizeMB: 25,
                tbr: 500,
                vcodec: 'avc1.42001E',
                acodec: 'mp4a.40.2',
                url: 'https://example.com/video.mp4',
                formatId: 18,
                type: 'video',
                quality: 'mp4 (360p)',
                is_audio: true
            },
            {
                itag: '140',
                ext: 'm4a',
                resolution: 'audio only',
                fps: null,
                filesizeMB: 5,
                tbr: 128,
                vcodec: 'none',
                acodec: 'mp4a.40.2',
                url: 'https://example.com/audio.m4a',
                formatId: 140,
                type: 'audio',
                quality: 'm4a (128kb/s)',
                is_audio: true
            }
        ];

        const response = {
            url: url,
            source: 'youtube',
            title: videoInfo.title,
            author: videoInfo.author,
            thumbnail: videoInfo.thumbnail,
            duration: videoInfo.duration,
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
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};
