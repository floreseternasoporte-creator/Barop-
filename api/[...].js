const { runVercelHandler } = require('../lib/vercel-adapter');

const handlers = {
  'chapters': require('../lib/functions/chapters').handler,
  'check-user-limits': require('../lib/functions/check-user-limits').handler,
  'community-notes': require('../lib/functions/community-notes').handler,
  'delete-story': require('../lib/functions/delete-story').handler,
  'following': require('../lib/functions/following').handler,
  'get-chapters': require('../lib/functions/get-chapters').handler,
  'get-stories': require('../lib/functions/get-stories').handler,
  'groq-chat': require('../lib/functions/groq-chat').handler,
  'likes': require('../lib/functions/likes').handler,
  'migrate-firebase-to-s3': require('../lib/functions/migrate-firebase-to-s3').handler,
  'notes': require('../lib/functions/notes').handler,
  'notifications': require('../lib/functions/notifications').handler,
  'scheduled-chapters': require('../lib/functions/scheduled-chapters').handler,
  'send-support-email': require('../lib/functions/send-support-email').handler,
  'update-story': require('../lib/functions/update-story').handler,
  'upload-image': require('../lib/functions/upload-image').handler,
  'upload-story': require('../lib/functions/upload-story').handler,
  'user-stats': require('../lib/functions/user-stats').handler,
  'users': require('../lib/functions/users').handler
};

module.exports = async (req, res) => {
  const rawPath = req.query.path || req.query.fn || [];
  const route = Array.isArray(rawPath) ? rawPath[0] : rawPath;
  const handler = handlers[route];

  if (!handler) {
    res.status(404).json({ error: 'Function not found.' });
    return;
  }

  await runVercelHandler(handler, req, res);
};
