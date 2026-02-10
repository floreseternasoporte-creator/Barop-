const AWS = require('../lib/aws-sdk');
const { runCloudflareHandler } = require('../lib/cloudflare-adapter');

const handlerModules = {
  'chapters': '../lib/handlers/chapters',
  'check-user-limits': '../lib/handlers/check-user-limits',
  'community-notes': '../lib/handlers/community-notes',
  'delete-story': '../lib/handlers/delete-story',
  'following': '../lib/handlers/following',
  'get-chapters': '../lib/handlers/get-chapters',
  'get-stories': '../lib/handlers/get-stories',
  'groq-chat': '../lib/handlers/groq-chat',
  'likes': '../lib/handlers/likes',
  'migrate-firebase-to-s3': '../lib/handlers/migrate-firebase-to-s3',
  'notes': '../lib/handlers/notes',
  'notifications': '../lib/handlers/notifications',
  'scheduled-chapters': '../lib/handlers/scheduled-chapters',
  'send-support-email': '../lib/handlers/send-support-email',
  'update-story': '../lib/handlers/update-story',
  'upload-image': '../lib/handlers/upload-image',
  'upload-story': '../lib/handlers/upload-story',
  'user-stats': '../lib/handlers/user-stats',
  'users': '../lib/handlers/users'
};

const getRouteInfo = (query) => {
  const rawPath = query?.path || query?.fn || [];

  if (Array.isArray(rawPath)) {
    return {
      route: rawPath[0],
      pathParts: rawPath.slice(1).filter(Boolean)
    };
  }

  if (typeof rawPath === 'string') {
    const parts = rawPath.split('/').filter(Boolean);
    return {
      route: parts[0],
      pathParts: parts.slice(1)
    };
  }

  return { route: undefined, pathParts: [] };
};

const getAwsConfigFlags = () => ({
  awsRegionConfigured: Boolean(process.env.AWS_REGION || process.env.MY_AWS_REGION),
  awsBucketConfigured: Boolean(process.env.AWS_S3_BUCKET || process.env.MY_AWS_S3_BUCKET_NAME),
  awsKeyConfigured: Boolean(process.env.AWS_ACCESS_KEY_ID || process.env.MY_AWS_ACCESS_KEY_ID),
  awsSecretConfigured: Boolean(process.env.AWS_SECRET_ACCESS_KEY || process.env.MY_AWS_SECRET_ACCESS_KEY)
});

const resolveBucket = () => process.env.AWS_S3_BUCKET || process.env.MY_AWS_S3_BUCKET_NAME;


const renderPlaceholderSvg = (width, height) => {
  const safeWidth = Number.isFinite(width) && width > 0 ? Math.min(width, 2000) : 400;
  const safeHeight = Number.isFinite(height) && height > 0 ? Math.min(height, 2000) : 600;
  const fontSize = Math.max(20, Math.round(Math.min(safeWidth, safeHeight) / 9));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${safeWidth}" height="${safeHeight}" viewBox="0 0 ${safeWidth} ${safeHeight}">
  <rect width="100%" height="100%" fill="#0a0a0a" />
  <rect x="12" y="12" width="${safeWidth - 24}" height="${safeHeight - 24}" rx="20" ry="20" fill="#1f1f1f" stroke="#3a3a3a" />
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="600">${safeWidth} × ${safeHeight}</text>
</svg>`;
};

module.exports = async (req, res) => {
  const { route, pathParts } = getRouteInfo(req.query);

  if (route === 'health') {
    res.status(200).json({
      ok: true,
      runtime: 'cloudflare-workers',
      ...getAwsConfigFlags()
    });
    return;
  }


  if (route === 'placeholder') {
    const [widthRaw, heightRaw] = pathParts;
    const width = parseInt(widthRaw, 10);
    const height = parseInt(heightRaw, 10);

    const svg = renderPlaceholderSvg(width, height);
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(svg);
    return;
  }

  if (route === 'health-s3') {
    try {
      const bucket = resolveBucket();
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-2'
      });

      await s3.headBucket({ Bucket: bucket }).promise();

      res.status(200).json({ ok: true, bucketConfigured: Boolean(bucket), bucketReachable: true });
      return;
    } catch (error) {
      res.status(500).json({
        ok: false,
        bucketConfigured: Boolean(resolveBucket()),
        bucketReachable: false,
        errorCode: error.code || 'UNKNOWN',
        errorMessage: error.message || 'S3 check failed'
      });
      return;
    }
  }

  const modulePath = handlerModules[route];

  if (!modulePath) {
    res.status(404).json({ error: 'Function not found.' });
    return;
  }

  try {
    const loaded = require(modulePath);
    const handler = loaded?.handler;

    if (typeof handler !== 'function') {
      res.status(500).json({ error: `Handler "${route}" is invalid.` });
      return;
    }

    await runCloudflareHandler(handler, req, res);
  } catch (error) {
    res.status(500).json({
      error: `Failed to load handler "${route}".`,
      details: error.message
    });
  }
};
