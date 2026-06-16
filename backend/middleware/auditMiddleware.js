const AuditLog = require('../models/AuditLog');

exports.audit = (action, resource) => async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    if (req.user) {
      await AuditLog.create({
        user: req.user._id,
        action,
        resource,
        resourceId: req.params.id,
        details: { body: req.body, query: req.query },
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        status: data.success !== false ? 'success' : 'failed',
      }).catch(() => {});
    }
    return originalJson(data);
  };
  next();
};
