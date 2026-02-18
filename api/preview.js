export default async function handler(req, res) {
  const ref = req.query.ref;
  const name = req.query.name || 'preview.mp3';

  if (!ref) {
    return res.status(400).json({ error: "Missing ref param" });
  }

  // Solo permitir extensiones de audio
  const allowedExts = ['mp3', 'm4a', 'wav', 'aac', 'ogg'];
  const ext = name.split('.').pop().toLowerCase();
  
  if (!allowedExts.includes(ext)) {
    return res.status(403).json({ error: "Extension not allowed" });
  }

  // Obtener URL del archivo desde la API
  const apiUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(name)}`;

  try {
    // Primero obtener headers para saber el tamaño total
    const headResponse = await fetch(apiUrl, { method: 'HEAD' });
    
    if (!headResponse.ok) {
      return res.status(headResponse.status).json({ error: "Audio not found" });
    }

    const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
    const contentType = headResponse.headers.get("content-type") || "audio/mpeg";

    // Calcular cuántos bytes para 60 segundos
    // Asumiendo ~128kbps = 16KB/segundo = 960KB para 60 segundos
    const PREVIEW_DURATION = 60; // segundos
    const BITRATE_ESTIMATE = 16000; // bytes por segundo (128kbps)
    const maxBytes = PREVIEW_DURATION * BITRATE_ESTIMATE;
    
    // Usar Range header para obtener solo los primeros bytes
    const rangeEnd = Math.min(maxBytes, contentLength) - 1;
    
    const audioResponse = await fetch(apiUrl, {
      headers: {
        'Range': `bytes=0-${rangeEnd}`
      }
    });

    if (!audioResponse.ok) {
      return res.status(audioResponse.status).json({ error: "Failed to fetch audio" });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", audioResponse.headers.get("content-length"));
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Range", `bytes 0-${rangeEnd}/${contentLength}`);
    res.status(206); // Partial Content

    // Stream el audio
    const stream = audioResponse.body;
    
    for await (const chunk of stream) {
      res.write(chunk);
    }
    
    res.end();

  } catch (err) {
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}
