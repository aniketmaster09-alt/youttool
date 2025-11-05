const ytdlp = require("yt-dlp-exec");

exports.handler = async (event) => {
  const videoUrl = event.queryStringParameters.url;
  if (!videoUrl) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing ?url= parameter" }),
    };
  }

  try {
    const info = await ytdlp(videoUrl, { dumpJson: true });
    const formats = info.formats.map((f) => ({
      itag: f.format_id,
      ext: f.ext,
      resolution: f.resolution || `${f.height || "?"}p`,
      fps: f.fps || null,
      filesize: f.filesize
        ? `${(f.filesize / (1024 * 1024)).toFixed(2)} MB`
        : "N/A",
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formats),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch video info" }),
    };
  }
};
