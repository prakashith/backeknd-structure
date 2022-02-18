const express = require('express');
const router = express.Router();
const btoa = require('btoa');
const parser = require('ua-parser-js');
const passport = require('passport');

/* Middlewares */
const formatRequest = require('../middlewares/formatRequest');
router.use(formatRequest);
const clients = {
    users: {
        host: process.env.SERVICE_RPC_HOST,
        port: process.env.CORE_USER_PORT
    }
};

const data = {};
const authenticator = require('../middlewares/authenticator')(clients, data);
const authenticateRole = require('../middlewares/authenticateRole');

/* Controllers */
const auth = require('../controllers/auth');

/* POST user registry. */
router.post('/v1/user/registry', function(req, res, next) {
    let data = req.body;
    data.req = req.data;

    auth.userRegistry(data, function(err, response) {
        let status = 0;
        if (err) {
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

/* POST user verify otp */
router.post('/v1/otp/verify', function(req, res, next) {
    let data = req.body;
    data.req = req.data;

    auth.otpVerify(data, function(err, response) {
        let status = 0;
        if (err) {
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

/* POST user joins update. */
router.post('/v1/user/signup', function (req, res, next) {
    let data = req.body;
    data.req = req.data;
    data.device = req.device.type;
    data.ip = req.ip;
    data.browser = parser(req.headers['user-agent']).browser.name;
    delete data.provider

    auth.userSignup(data, function (err, response) {
        let status = 0;
        if (err) {
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

router.get('/v1/check/userName', function(req, res, next) {
    let data = req.query;
    data.req = req.data;

    auth.checkUserName(data, function(err, response) {
        let status = 0;
        if (err) {
            console.log(err);
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

/* POST user logins. */
router.post('/v1/user/login', function (req, res, next) {
    let data = req.body;
    data.req = req.data;
    data.device = req.device.type;
    data.ip = req.ip;
    data.browser = parser(req.headers['user-agent']).browser.name;
    data.login = true;
    auth.userLogin(data, function (err, response) {
        let status = 0;
        if (err) {
            console.log(err);
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    }, "NOT_VERIFIED");
});

router.post('/v1/user/forgot/password', function (req, res, next) {
    let data = req.body;
    data.req = req.data;
    data.device = req.device.type;
    data.ip = req.ip;
    data.browser = parser(req.headers['user-agent']).browser.name;
    
    auth.forgotPassword(data, function (err, response) {
        
        let status = 0;
        if (err) {
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

router.get('/v1/user/forgot/verify/link/:token', function (req, res, next) {
    let data = req.params;
    data.req = req.data;
    data.device = req.device.type;
    data.ip = req.ip;
    data.browser = parser(req.headers['user-agent']).browser.name;
    auth.forgotVerifyLink(data, function (err, response) {
        
        let status = 0;
        if (err) {
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

router.post('/v1/user/forgot/change/password', function(req, res, next) {
    let data = req.body;
    data.req = req.data;

    auth.forgotChangePassword(data, function(err, response) {
        let status = 0;
        if (err) {
            console.log(err);
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

router.patch('/v1/user/reset/password', [authenticator,authenticateRole(['USER'])],function(req, res, next) {
    let data = req.body;
    data.req = req.data;

    auth.resetPassword(data, function(err, response) {
        let status = 0;
        if (err) {
            console.log(err);
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

/* POST user verify captcha */
router.post('/v1/verify/captcha', function(req, res, next) {
    let data = req.body;
    data.req = req.data;

    auth.verifyCaptcha(data, function(err, response) {
        let status = 0;
        if (err) {
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

/**Social Connections */

router.get('/v1/google', function (req, res, next) {

    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: "webLogin"
    })(req, res, next)
});

router.get('/v1/google/callback', passport.authenticate('google', { failureRedirect: '/signUp' }), function (req, res, next) {

        let data = req.user.profile;
        data.req = req.data;
        data.device = req.device.type;
        data.ip = req.ip;
        data.browser = parser(req.headers['user-agent']).browser.name;
        auth.socialLoginOrSignup(data, function (err, response) {
            let status = 0;
            if (err) {
                console.log(err);
                status = err.status;
                // return res.status(status).send(response);
                return res.redirect(`${process.env.CLIENT_URL}/auth/social/${btoa(JSON.stringify(err))}`);
            }
            status = response.status;
            // return res.status(status).send(response);
            return res.redirect(`${process.env.CLIENT_URL}/auth/social/${btoa(JSON.stringify(response))}`);
            
        });
})

module.exports = router;