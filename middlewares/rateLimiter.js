const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
    // windowMs: 15 * 60 * 1000, // 15 min in milliseconds
    
    windowMs: 5000, // 5 sec
    max: 1, // 1 call allowed per 5 sec
    message: {
        success: false,
        message: "Too many requests, Please try again after 30 minutes"
    },
    statusCode: 429,
    headers: true,
});
module.exports = { rateLimiter };