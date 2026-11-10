const prisma = require('../db/prisma');
const logger = require('../logger');

const auditMiddleware = (req, res, next) => {
  res.on('finish', () => {
    // Skip OPTIONS and chat websocket polling for less noise
    if (req.method === 'OPTIONS' || req.originalUrl.includes('socket.io') || req.originalUrl.includes('/api/ads/active')) {
      return;
    }

    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    
    const logAudit = (finalUserStr) => {
      // Map methods to readable actions
      let action = method;
      switch(method) {
        case 'GET': action = 'VIEWED'; break;
        case 'POST': action = 'CREATED/SUBMITTED'; break;
        case 'PUT': action = 'UPDATED'; break;
        case 'DELETE': action = 'DELETED'; break;
      }

      // Extract relevant payload data, filter out sensitive or huge fields
      let bodyStr = '';
      if (['POST', 'PUT'].includes(method) && req.body && Object.keys(req.body).length > 0) {
        const safeBody = { ...req.body };
        
        // Remove sensitive/large fields
        const hiddenFields = ['password', 'profilePic', 'images', 'customLogoUrl'];
        hiddenFields.forEach(field => {
          if (safeBody[field] !== undefined) {
            safeBody[field] = '[REDACTED]';
          }
        });
        
        bodyStr = ` | Data: ${JSON.stringify(safeBody)}`;
      }

      const message = `[AUDIT] ${status} | ${action} ${url} | ${finalUserStr}${bodyStr}`;
      logger.audit(message, {
        httpStatus: status,
        httpMethod: method,
        route: url,
        user: finalUserStr
      });
    };

    // Attempt to identify user by querying the database asynchronously
    if (req.user && req.user.id) {
      prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, name: true, email: true } })
        .then(u => {
          if (u) {
            logAudit(`User ${u.id} (${u.name} : ${u.email})`);
          } else {
            logAudit(`User ${req.user.id} (Unknown)`);
          }
        })
        .catch(() => logAudit(`User ${req.user.id} (Error DB)`));
    } else if (req.body && req.body.email && url.includes('/login')) {
      logAudit(`Login Attempt (${req.body.email})`);
    } else {
      logAudit('Guest');
    }
  });

  next();
};

module.exports = auditMiddleware;
