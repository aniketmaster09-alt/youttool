// netlify/functions/download.js
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }
  try {
    const { url } = JSON.parse(event.body);
    if (!url || !url.includes("youtube.com") && !url.includes("youtu.be")) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Invalid YouTube URL" })
      };
    }
    const { stdout } = await execAsync(`yt-dlp -J "${url}"`);
    const info = JSON.parse(stdout);
    const medias = [];
    info.formats.forEach((format) => {
      if (format.url) {
        const isVideo = format.vcodec && format.vcodec !== "none";
        const isAudio = format.acodec && format.acodec !== "none";
        const media = {
          formatId: parseInt(format.format_id),
          label: `${format.ext} (${format.height ? format.height + "p" : format.abr ? format.abr + "kb/s" : "audio"})`,
          type: isVideo ? "video" : "audio",
          ext: format.ext,
          quality: `${format.ext} (${format.height ? format.height + "p" : format.abr ? format.abr + "kb/s" : "audio"})`,
          width: format.width || null,
          height: format.height || null,
          url: format.url,
          bitrate: format.tbr ? Math.round(format.tbr * 1e3) : format.abr ? Math.round(format.abr * 1e3) : null,
          fps: format.fps || null,
          audioQuality: isAudio ? format.abr > 100 ? "AUDIO_QUALITY_MEDIUM" : "AUDIO_QUALITY_LOW" : null,
          audioSampleRate: format.asr ? format.asr.toString() : null,
          mimeType: `${isVideo ? "video" : "audio"}/${format.ext}${format.vcodec ? `; codecs="${format.vcodec}${isAudio ? ", " + format.acodec : ""}"` : ""}`,
          duration: Math.round(info.duration),
          is_audio: isAudio,
          extension: format.ext
        };
        medias.push(media);
      }
    });
    const response = {
      url,
      source: "youtube",
      title: info.title,
      author: info.uploader || "",
      thumbnail: info.thumbnail,
      duration: Math.round(info.duration),
      medias,
      type: "multiple",
      error: false,
      time_end: Date.now() % 1e3
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
//# sourceMappingURL=download.js.map
