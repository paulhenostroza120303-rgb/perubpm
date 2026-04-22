import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const B2_ACCOUNTS = [
  {
    name: "perubpm",
    keyId: process.env.B2_ACCESS_KEY_ID || "00535f8a9da3a490000000002",
    key: process.env.B2_APPLICATION_KEY || "K0055pj4u8TZy5U0twuBjHajDHKUg6A"
  },
  {
    name: "perubpm2",
    keyId: process.env.B2_ACCESS_KEY_ID_2,
    key: process.env.B2_APPLICATION_KEY_2
  }
].filter(a => a.keyId && a.key);

export const config = {
  maxDuration: 120
};

function createS3Client(keyId, key) {
  return new S3Client({
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    region: "us-east-005",
    credentials: { accessKeyId: keyId, secretAccessKey: key }
  });
}

async function existsInB2(s3, bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    return e.$metadata?.httpStatusCode !== 404;
  }
}

async function uploadToB2(s3, bucket, key, data, type) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: data,
    ContentType: type || 'application/octet-stream'
  }));
}

async function findAvailableBucket(b2Key) {
  for (const account of B2_ACCOUNTS) {
    const s3 = createS3Client(account.keyId, account.key);
    const exists = await existsInB2(s3, account.name, b2Key);
    if (exists) {
      return { s3, bucket: account.name };
    }
  }
  return null;
}

async function uploadToAvailableBucket(b2Key, data, contentType) {
  for (const account of B2_ACCOUNTS) {
    try {
      const s3 = createS3Client(account.keyId, account.key);
      await uploadToB2(s3, account.name, b2Key, data, contentType);
      return { s3, bucket: account.name };
    } catch (e) {
      console.log(`❌ Upload failed to ${account.name}:`, e.message);
      continue;
    }
  }
  throw new Error('All buckets failed');
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
    const found = await findAvailableBucket(b2Key);
    
    if (found) {
      console.log('📦 B2 HIT:', found.bucket, b2Key);
      const url = await getSignedUrl(found.s3, new GetObjectCommand({
        Bucket: found.bucket,
        Key: b2Key
      }), { expiresIn: 86400 });
      return res.redirect(url);
    }
    
    console.log('☁️ B2 MISS:', b2Key);
    
    const apiUrl = `https://api.perubpm.com/catalog/drive/download/${ref}?fileName=${encodeURIComponent(fileName)}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return res.redirect('/?error=archivo_no_encontrado');
    }
    
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const arrayBuffer = await response.arrayBuffer();
    
    const uploaded = await uploadToAvailableBucket(b2Key, arrayBuffer, contentType);
    console.log('✅ Uploaded to B2:', uploaded.bucket, b2Key);
    
    const url = await getSignedUrl(uploaded.s3, new GetObjectCommand({
      Bucket: uploaded.bucket,
      Key: b2Key
    }), { expiresIn: 86400 });
    
    return res.redirect(url);

  } catch (error) {
    console.error('Error:', error);
    return res.redirect('/?error=error_descarga');
  }
}