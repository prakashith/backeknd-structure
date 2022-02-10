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

/* POST test. */
router.post('/v1/test', function(req, res, next) {
    let data = req.body;
    data.req = req.data;

    auth.userTest(data, function(err, response) {
        let status = 0;
        if (err) {
            status = err.status;
            return res.status(status).send(err);
        }
        status = response.status;
        return res.status(status).send(response);
    });
});

module.exports = router;