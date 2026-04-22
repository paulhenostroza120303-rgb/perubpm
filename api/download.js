import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  region: "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || "00535f8a9da3a490000000002",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "K0055pj4u8TZy5U0twuBjHajDHKUg6A"
  }
});

const BUCKET = "perubpm";

export const config = {
  maxDuration: 180
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
    ContentType: type || 'application/octet-stream'
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ref, name } = req.query;

  if (!ref || !name) {
    return res.redirect('/?error=parametros');
  }

  const fileName = decodeURIComponent(name);
  const b2Key = `${ref}/${fileName}`;

  try {
    const cached = await existsInB2(b2Key);
    
    if (cached) {
      const url = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: BUCKET,
        Key: b2Key
      }), { expiresIn: 86400 });

      const response = await fetch(url);
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const arrayBuffer = await response.arrayBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader('Content-Length', arrayBuffer.byteLength);
      res.setHeader('Cache-Control', 'private, max-age=31536000');
      
      return res.send(Buffer.from(arrayBuffer));
    }
    
    const apiUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(fileName)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return res.redirect('/?error=archivo_no_encontrado');
    }
    
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const arrayBuffer = await response.arrayBuffer();
    
    await uploadToB2(b2Key, arrayBuffer, contentType);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', arrayBuffer.byteLength);
    
    return res.send(Buffer.from(arrayBuffer));

  } catch (error) {
    console.error('Error:', error);
    return res.redirect('/?error=error_descarga');
  }
}