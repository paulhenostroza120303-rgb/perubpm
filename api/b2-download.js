import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  endpoint: "https://s3.us-east-005.backblazeb2.com",
  region: "us-east-005",
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  }
});

const BUCKET = "perubpmCreado";

export const config = {
  maxDuration: 60
};

async function existsInB2(key) {
  try {
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e) {
    return e.$metadata?.httpStatusCode !== 404;
  }
}

async function uploadToB2(key, data, type) {
  await s3Client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: data,
    ContentType: type || 'application/octet-stream'
  }));
}

function getB2Url(key) {
  return `https://s3.us-east-005.backblazeb2.com/${BUCKET}/${key}`;
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
      console.log('📦 B2 Cache HIT:', b2Key);
      const url = await getSignedUrl(s3Client, new GetObjectCommand({
        Bucket: BUCKET,
        Key: b2Key
      }), { expiresIn: 3600 });
      
      return res.redirect(url);
    }
    
    console.log('☁️ B2 Cache MISS:', b2Key);
    
    const apiUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(fileName)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      console.error('API Error:', response.status);
      return res.redirect('/?error=archivo_no_encontrado');
    }
    
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const arrayBuffer = await response.arrayBuffer();
    
    await uploadToB2(b2Key, arrayBuffer, contentType);
    console.log('✅ Subido a B2:', b2Key);
    
    const url = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: BUCKET,
      Key: b2Key
    }), { expiresIn: 3600 });
    
    return res.redirect(url);

  } catch (error) {
    console.error('Error:', error);
    return res.redirect('/?error=error_descarga');
  }
}