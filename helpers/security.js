const mute = require('immutable');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const async = require('async');

// Models
const Users = require('../models/users');

// Response Struct
const responseStruct = mute.Map({
    signature: null,
    message: "",
    error: null,
    type: "auth",
    action: null,
    id: null,
    data: null,
    status: null
});

/**
 * @param  {JSON} data - signup data to create token
 * @param  {string} cb -encrypted string
 */

// Data Encryption and Decryption 
const encryptData = function(data, response, cb) {
    if (!cb) {
        cb = response;
    }
    try {
        var signOptions = {
            issuer: "Authorization",
            subject: "iam@user.me",
            audience: "backend",
            expiresIn: "30d", // 30 days validity
            algorithm: "HS256"
        };
        let encryptedData = jwt.sign(data, process.env.ENCRYPT_SALT_STATIC, signOptions);
        // console.log("encryptedData", encryptedData)
        cb(null, encryptedData);
    } catch (e) {
        cb(e);
    }

}
exports.encryptData = encryptData;

/**
 * @param  {string} encryptedData - verify token
 * @param  {boolean} cb -valid or not
 */
const decryptData = function(encryptedData, response, cb) {
    if (!cb) {
        cb = response;
    }
    try {
        let verifyOptions = {
            issuer: "Authorization",
            subject: "iam@user.me",
            audience: "backend",
            expiresIn: "30d", // 30 days validity
            algorithm: "HS256"
        };
        let decryptedData = jwt.verify(encryptedData.token, process.env.ENCRYPT_SALT_STATIC, verifyOptions);
        // console.log("decryptedData", decryptedData)
        cb(null, decryptedData);
    } catch (e) {
        cb(e);
    }
}
exports.decryptData = decryptData;

/**
 * @param  {string} plaintext - password
 * @param  {JSON} cb -hash, salt
 */

// Password Hashing and Comparing
const generatePassword = function(plaintext, res, cb) {
    if (!cb) {
        cb = res
    }

    const salt = crypto.randomBytes(16).toString('base64')
    const randomSalt = Buffer(salt,'base64');
    const hash = crypto.pbkdf2Sync(plaintext, randomSalt, 10000, 64, 'sha1').toString('base64');
    
    return cb(null, {
        hash: hash,
        salt: salt
    })
};
exports.generatePassword = generatePassword;

/**
 * @param  {string} plaintext - password
 * @param  {string} hash -user encrypted password
 * @param  {boolean} cb -password matches or not
 */

const comparePassword = function(plaintextInput, hash, salt, cb) {
    // console.log(plaintextInput,hash, salt)
    const userSalt = Buffer(salt,'base64');
    const hashResult = crypto.pbkdf2Sync(plaintextInput, userSalt, 10000, 64, 'sha1').toString('base64')
    if(hashResult === hash){
            return cb(null,true)
    }else{
            return cb(null,false)
    }
};
exports.comparePassword = comparePassword;

/**
 * @param  {string} email - email
 * returns true or false
 */
// Input Validators
const validateEmail = function(email) {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
};
exports.validateEmail = validateEmail;

/**
 * @param  {string} password - password
 * returns true or false
 */
const validatePassword = function(password) {
    if (password.length < 8 || password.length > 50) {
        return false;
    } else {
        return true;
    }
};
exports.validatePassword = validatePassword;

/**
 * @param  {string} phone - phone
 * returns true or false
 */
const validatePhone = function(phone) {
    if (phone.length < 10 || phone.length > 13) {
        return false;
    } else {
        return true;
    }
};
exports.validatePhone = validatePhone;

/**
 * @param  {string} data - email or accountId
 * @param  {JSON} cb -returns user details
 */
const readUserByKeyValue = function(data, response, cb) {
    if (!cb) {
        cb = response;
    }
    let findData = {};

    //third priority
    if(data.id){
        findData = {
            _id: data.id,
        }
    }
    //second priority
    if (data.email) {
        findData = {
            email: data.email,
        }
    }
    //first priority
    if (data.identifier) {
        findData = {
            accountId: data.identifier,
        }
    }
    Users.findOne(findData, function(err, user) {
        if (err) {
            return cb(responseStruct.merge({
                signature: data.req.signature,
                action: "security",
                status: 500,
                message: "Something went wrong!",
                error: true
            }).toJS());
        }
        if(!user){
            return cb(
                responseStruct.merge({
                    signature: data.req.signature,
                    action: "security",
                    status: 403,
                    message: "Invalid User: No user found",
                    error: true
                }).toJS());    
        }

        if(user.isBlocked){
            return cb(
                responseStruct.merge({
                    signature: data.req.signature,
                    action: "security",
                    status: 403,
                    message: "Invalid User: User blocked by admin",
                    error: true
                }).toJS());    
        }
        if(user.emailVerified == false){
            return cb(
                responseStruct.merge({
                    signature: data.req.signature,
                    action: "security",
                    status: 403,
                    message: "Invalid User: User not verified",
                    error: true
                }).toJS());    
        }
        if(user.isActive == false){
            return cb(
                responseStruct.merge({
                    signature: data.req.signature,
                    action: "security",
                    status: 403,
                    message: "Invalid User: User not active",
                    error: true
                }).toJS());    
        }
        if(data.login && (user.provider != 'email') && data.password){
            return cb(
                responseStruct.merge({
                    signature: data.req.signature,
                    action: "security",
                    status: 403,
                    message: "Invalid User: Please select correct social platform",
                    error: true
                }).toJS());    
        }
    
        return cb(null,
            responseStruct.merge({
                signature: data.req.signature,
                action: "security",
                status: 200,
                message: "",
                data: user,
                error: false
            }).toJS());
    });
};

exports.readUserByKeyValue = readUserByKeyValue;

// Auth validate token
/**
 * @param  {string} data - token and identifier
 * @param  {JSON} cb -returns user token valid or not
 */

 exports.validateToken = function (data, response, cb) {
    if (!cb) {
        cb = response
    }
    if (!data.token || !data.identifier) {
        return cb(responseStruct.merge({
            signature: data.req.signature,
            action: "validateToken",
            status: 403,
            message: "Invalid Credentials",
            error: true
        }).toJS());
    }

    let waterfallFunctions = [];
    waterfallFunctions.push(async.apply(readUserByKeyValue, data));
    waterfallFunctions.push(async.apply(decryptData, data));
    async.waterfall(waterfallFunctions, cb);

} 
/* Unexported Functions */