const { runVercelHandler } = require('../lib/vercel-adapter');

const routes = {
  'check-user-limits': require('../lib/functions/check-user-limits'),
  'chapters': require('../lib/functions/chapters'),
  'community-notes': require('../lib/functions/community-notes'),
  'delete-story': require('../lib/functions/delete-story'),
  'following': require('../lib/functions/following'),
  'get-chapters': require('../lib/functions/get-chapters'),
  'get-stories': require('../lib/functions/get-stories'),
  'groq-chat': require('../lib/functions/groq-chat'),
  'likes': require('../lib/functions/likes'),
  'migrate-firebase-to-s3': require('../lib/functions/migrate-firebase-to-s3'),
  'notes': require('../lib/functions/notes'),
  'notifications': require('../lib/functions/notifications'),
  'scheduled-chapters': require('../lib/functions/scheduled-chapters'),
  'send-support-email': require('../lib/functions/send-support-email'),
  'update-story': require('../lib/functions/update-story'),
  'upload-image': require('../lib/functions/upload-image'),
  'upload-story': require('../lib/functions/upload-story'),
  'user-stats': require('../lib/functions/user-stats'),
  'users': require('../lib/functions/users')
};

module.exports = async (req, res) => {
  const route = req.query?.route;
  const handlerModule = routes[route];

  if (!handlerModule?.handler) {
    res.status(404).json({ error: 'Ruta no encontrada.' });
    return;
  }

  await runVercelHandler(handlerModule.handler, req, res);
};
