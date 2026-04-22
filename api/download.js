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

const BUCKET = "perubpmCreado";

export const config = {
  maxDuration: 120
};

async function existsInB2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e) {
    console.log('existsInB2 error:', e.name, e.message);
    return false;
  }
}

async function uploadToB2(key, data, type) {
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: type || 'application/octet-stream'
    }));
  } catch (e) {
    console.log('uploadToB2 error:', e.name, e.message);
    throw e;
  }
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

  console.log('Download request:', { ref, name, b2Key });

  try {
    const cached = await existsInB2(b2Key);
    
    if (cached) {
      console.log('📦 B2 HIT:', b2Key);
      const url = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: BUCKET,
        Key: b2Key
      }), { expiresIn: 86400 });
      
      return res.redirect(url);
    }
    
    console.log('☁️ B2 MISS:', b2Key);
    
    const apiUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(fileName)}`;
    console.log('Fetching from API:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('API Error:', response.status);
      return res.redirect('/?error=archivo_no_encontrado');
    }
    
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    
    console.log('📤 Uploading to B2:', b2Key, arrayBuffer.byteLength, 'bytes');
    await uploadToB2(b2Key, arrayBuffer, contentType);
    console.log('✅ Uploaded to B2:', b2Key);
    
    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: BUCKET,
      Key: b2Key
    }), { expiresIn: 86400 });
    
    return res.redirect(url);

  } catch (error) {
    console.error('❌ Error completo:', error);
    console.error('Stack:', error.stack);
    return res.redirect('/?error=error_descarga');
  }
}