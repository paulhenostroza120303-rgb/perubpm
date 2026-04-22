import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  region: "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  },
  forcePathStyle: true
});

const BUCKET = "perubpmCreado";

const MAX_BYTES = {
  'mp3': 3000000,
  'm4a': 3500000,
  'wav': 10000000,
  'flac': 6000000,
  'ogg': 2000000,
  'aac': 2000000
};

async function existsInB2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e) {
    return e.$metadata?.httpStatusCode !== 404;
  }
}

async function uploadToB2(key, data, type) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: data,
    ContentType: type || 'audio/mpeg'
  }));
}

export default async function handler(req, res) {
  const ref = req.query.ref;
  const name = req.query.name || 'preview.mp3';

  if (!ref) {
    return res.status(400).json({ error: "Missing ref param" });
  }

  const ext = name.split('.').pop().toLowerCase();
  const allowedExts = ['mp3', 'm4a', 'wav', 'flac', 'aac', 'ogg'];
  
  if (!allowedExts.includes(ext)) {
    return res.status(403).json({ error: "Extension not allowed" });
  }

  const b2Key = `preview/${ref}/${name}`;
  const maxBytes = MAX_BYTES[ext] || 2000000;

  try {
    const cached = await existsInB2(b2Key);
    
    if (cached) {
      console.log('📦 Preview B2 HIT:', b2Key);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.redirect(`https://s3.us-east-005.backblazeb2.com/${BUCKET}/${b2Key}`);
    }
    
    console.log('☁️ Preview B2 MISS:', b2Key);
    
    const apiUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(name)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return res.status(response.status).json({ error: "Audio not found" });
    }

    const contentType = response.headers.get("content-type") || "audio/mpeg";
    
    const chunks = [];
    let bytesSent = 0;
    
    for await (const chunk of response.body) {
      if (bytesSent >= maxBytes) break;
      chunks.push(chunk);
      bytesSent += chunk.length;
    }
    
    const buffer = Buffer.concat(chunks);
    
    console.log('📤 Subiendo preview a B2:', b2Key);
    await uploadToB2(b2Key, buffer, contentType);
    console.log('✅ Preview subido a B2:', b2Key);
    
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    
    return res.redirect(`https://s3.us-east-005.backblazeb2.com/${BUCKET}/${b2Key}`);

  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: "Proxy error", detail: err.message });
  }
}