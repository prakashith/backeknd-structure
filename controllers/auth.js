const async = require('async');
const moment = require('moment');
const geoip = require('geoip-lite');
const countryList = require('country-list');
const mongoose = require('mongoose');
const atob = require('atob');
const btoa = require('btoa');
const axios = require('request');

// Model
const Users = require('../models/users');
const ResetPasswords = require('../models/resetPasswords');
const OtpLog = require('../models/otpLog');
const LoginStats = require('../models/loginStats');

// Helpers Service
const utilities = require('../helpers/security');
const responseUtilities = require('../helpers/sendResponse');
// const email = require('../helpers/email');


//Contoller for user registry
exports.userRegistry = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    if (!data.email) {
        return cb(sendResponse(400, "Email Missing", "userRegistry",null, data.req.signature));    
    }

    Users.findOne({email:data.email},(err,res)=>{
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "userRegistry", null, data.req.signature));
        }
        if (res && res.emailVerified) {
            let sendData = {
                provider: res.provider,
                emailVerified: res.emailVerified,
                isActive: res.isActive
            }
            return cb(responseUtilities.responseStruct(400, "Email ID Already Verify", "validateEmail", sendData, data.req.signature));  
        }

        let waterFallFunctions = [];
        waterFallFunctions.push(async.apply(generateOTP, data));
        waterFallFunctions.push(async.apply(registerUser, data));
        // waterFallFunctions.push(async.apply(sendRegistryMail, data));

        async.waterfall(waterFallFunctions, cb);
            
        
    })


};

const generateOTP = function (data, response, cb) {
    if (!cb) cb = response;
    let findData = {
        email:data.email,
        isUsed:false,
        isExpired:false,
        purpose:'Signup'
    }
    OtpLog.findOne(findData).exec((err,res)=>{
        if(err){
            console.error(err)
            return cb(responseUtilities.responseStruct(500, null, "generateOTP", null, data.req.signature));
        }
        if(res){
              OtpLog.updateOne({_id:res._id},{isUsed:true}).exec((errU,resU)=>{
                if(errU){
                    console.error(errU)
                }else{
                    console.log("updated Log")
                }
            }) 
        }
        
        let generatedOTP
        if(process.env.DEV == 'true'){
            generatedOTP = process.env.OTP_FIXED;
        }else{
            generatedOTP =  Math.floor(100000 + Math.random() * 900000) ;
        }
        let insertData = {
            email:data.email,
            otp: generatedOTP,
            otpExpiration: (new Date().getTime() + 1000 * 60 * 30),
            purpose: "Signup"

        }
        OtpLog.create(insertData,(err, res)=>{
            if(err){
                console.log(err);
                return cb(responseUtilities.responseStruct(500, null, "generateOTP", null, data.req.signature));
            }
            data.otp = generatedOTP
            return cb(null, responseUtilities.responseStruct(200, "OTP log update", "generateOTP", null, data.req.signature));
        });

        
    })
}

const registerUser = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    let findData = {email:data.email}
    let updateData = {email: data.email}
    let options ={
        upsert:true,
        new:true,
        setDefaultsOnInsert:true
    }   
        Users.findOneAndUpdate(findData,updateData, options,(err, res) => {
            if (err) {
                console.error('registerUser', err);
                return cb(responseUtilities.responseStruct(500, "Something went wrong", "user_registry.registerUser", null, data.req.signature));

            }
            let sendData = {
                email:res.email,
                emailVerified: res.emailVerified,
                isActive: res.isActive
            }
            return cb(null, responseUtilities.responseStruct(200, "Email just added in registry!", "user_registry.registerUser", sendData, data.req.signature));
        })
}

const sendRegistryMail = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    email.sendOtpEmailRegistry(data, function(err, res){
        if (err) {
            console.error('sendRegistryMail', err);
            return cb(responseUtilities.responseStruct(500, "Something went wrong Unable to sent email", "user_registry.sendRegistryMail", null, data.req.signature));

        }
        return cb(null, responseUtilities.responseStruct(200, "Email just added in registry!", "user_registry.registerUser", response.data, data.req.signature));

    })
}


const otpVerify = function (data, response, cb) {
    if (!cb) cb = response;

    if (!data.email || !data.otp) {
        return cb(responseUtilities.responseStruct(400, "Missing Params", "otpVerify", null, data.req.signature));
    }

    let find_data = {
        email: data.email,
        otp: data.otp,
        isUsed: false,
        isExpired:false
    }
    OtpLog.findOne(find_data, function (err, res) {
        if (err) {
            console.log(err);
            return cb(responseUtilities.responseStruct(500, null, "otpVerify", null, data.req.signature));
        }
        if(!res) {
            return cb(responseUtilities.responseStruct(400, "Wrong OTP/Email or OTP Already used!", "otpVerify", null, data.req.signature));
        }

        if (new Date().getTime() > res.otpExpiration) {
            OtpLog.findByIdAndUpdate({_id:res._id},{isExpired:true},(errE,resE)=>{
                if(errE){console.log("Unable to update expire OTP Log", errE)}
            })
            return cb(responseUtilities.responseStruct(400, "OTP has been expired", "verifyAndUpdateOtp", null, data.req.signature));
        }

        let find_data = {
            email: data.email
        }
        let update_data = {
            isUsed: true
        }
        OtpLog.updateOne(find_data, update_data, function (err, response) {
            if (err) {
                console.error(err);
                return cb(responseUtilities.responseStruct(500, null, "verifyAndUpdateOtp", null, data.req.signature));
            }
            let findUser={
                email:data.email
            }
            let updateUser={
                emailVerified:true,
                isBlocked: false
            }
            Users.updateOne(findUser,updateUser).exec((errU,resU)=>{
                if (errU) {
                    console.error(errU);
                    return cb(responseUtilities.responseStruct(500, null, "otpVerify", null, data.req.signature));
                }
                let sendData = {
                    emailVerified: true,
                    isActive: resU.isActive
                }
                return cb(null, responseUtilities.responseStruct(200, "Successfully verified", "otpVerify", sendData, data.req.signature));

            })

        });
    });

}

exports.otpVerify = otpVerify;

const socialLoginOrSignup = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    if (!data.provider) {
        return cb(responseUtilities.responseStruct(400, "Missing Provider.", "social_login", null, data.req.signature));
    }
    data.email = (data.emails && data.emails.length && data.emails[0].value)?data.emails[0].value:null;

    if(!data.email){
        return cb(responseUtilities.responseStruct(400, "Email not provided by social platform", "socialLoginOrSignup", null, data.req.signature));
    }
    let checkReq = {
        email: data.email
    };

    Users.findOne(checkReq, function (err, res) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "socialLogin", null, data.req.signature));
        }
        //social checks Login
        if (res) {
            let sendData = {
                emailVerified: res.emailVerified,
                email: data.email
            }
            if(res.provider == 'email' || (res.emailVerified == false)){
               
                return cb(responseUtilities.responseStruct(400, "Please Login with correct platform.", "socialLoginOrSignup", sendData, data.req.signature));
            }

            if(res.provider != data.provider){
                return cb(responseUtilities.responseStruct(400, "Please Login with correct social platform.", "socialLoginOrSignup", sendData, data.req.signature));
            }
        }
       

        if (res && res.isActive) {
            //social login

            let userData = res;

            let update_payload = {
                _id: userData._id,
                name: userData.name,
                email: userData.email,
                accountId: userData.accountId,
                role: userData.role,
                provider: userData.provider,
                ip: data.ip,
                device: data.device,
                browser: data.browser,
                req: data.req
            };

            socialLogin(update_payload, response, cb);
        
        } else {
            //social signup
            let firstName = data.displayName.split(" ")[0]
            let lastName = data.displayName.split(" ")[1]

            let insert_payload = {
                name: data.displayName,
                firstName: firstName,
                lastName: lastName,
                email: data.email,
                ip: data.ip,
                device: data.device,
                browser: data.browser,
                req: data.req
            }
            if(data.username){
                insert_payload.userName = data.username
            }else{
                insert_payload.userName = data.displayName.split(" ").join("_")
            }

            switch (data.provider) {
                case "google":
                    insert_payload.provider = 'google';
                    insert_payload.social = data._raw;
                    insert_payload.profilePicture = data.picture;
                    break;  
                default:
                    console.log("Something goes wildly wrong");
                    break;
            };

            socialSignup(insert_payload, null, cb);

        }
    });

}

exports.socialLoginOrSignup = socialLoginOrSignup;

const socialLogin = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    async.waterfall([
        async.apply(encryptData, data),
        async.apply(addLoginStats, data)
    ], cb);
        

};

const socialSignup = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    async.waterfall([
        async.apply(generateAccountId, data),
        async.apply(socialRegister, data),
        async.apply(encryptData, data),
        async.apply(addLoginStats, data)

    ], cb);
        

};

const socialRegister = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    let findData = {email:data.email}
    let updateData = { 
            name: data.name,
            userName:data.userName,
            email: data.email,
            socialDetails: data.social,
            provider: data.provider,
            accountId: response.data.accountId,
            userMeta:{
                ip: data.ip,
                device: data.device,
                browser: data.browser,
                profilePicture:data.profilePicture
            },
            emailVerified:true,
            isActive:true

        }

        let options ={
            upsert:true,
            new:true,
            setDefaultsOnInsert:true
        }
        Users.findOneAndUpdate(findData,updateData, options,(err, res) => {
            if (err) {
                console.error('socialRegister', err);
                return cb(responseUtilities.responseStruct(500, "Something went wrong", "socialRegister.registerUser", null, data.req.signature));

            }
            data.role = response.data.role;
            data._id = response.data._id;
           
            return cb(null, responseUtilities.responseStruct(200, "Email just added in registry!", "socialRegister.registerUser", null, data.req.signature));
        })
}


const userSignup = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    validateSignupInput(data, function (err) {
        if (err) {
            return cb(err);
        } else {
            async.waterfall([
                async.apply(utilities.generatePassword, data.password),
                async.apply(generateAccountId, data),
                async.apply(insertUser, data),
                async.apply(userLoginAsync, data)
            ], cb);
        }
    })

};
exports.userSignup = userSignup;

const validateSignupInput = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    let functionsWaterfall = [];

    if (!data.name || !data.firstName || !data.lastName || !data.email || !data.userName) {

        return cb(responseUtilities.responseStruct(400, "Missing or Invalid Params", "validateSignupInput", null, data.req.signature));
    }
    data.email = data.email.trim()
    data.userName = data.userName.trim()

    functionsWaterfall.push(async.apply(checkEmailExists, data));
    functionsWaterfall.push(async.apply(validatePassword, data));
    functionsWaterfall.push(async.apply(checkUserName, data));


    async.waterfall(functionsWaterfall, cb);
};


const checkEmailExists = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    if (!data.email) {
        return cb(responseUtilities.responseStruct(400, "Missing Email Address", "validateEmail", null, data.req.signature));
    }
    if (!utilities.validateEmail(data.email)) {
        return cb(responseUtilities.responseStruct(400, "Invalid Email Address", "validateEmail", null, data.req.signature));
    }

    let where = {
        email: data.email
    }

    Users.findOne(where, function (err, res) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "validateEmail", null, data.req.signature));
        }
        if(res){
            if(res.provider != 'email'){
                 return cb(responseUtilities.responseStruct(400, "Email ID Already Exist Please Choose correct Social Platform", "validateEmail", sendData, data.req.signature));  
            }
            if (res.emailVerified && (res.isActive == false)) {
                return cb(null, responseUtilities.responseStruct(200, null, "validateEmail", null, data.req.signature));
            }
            let sendData = {
                emailVerified: res.emailVerified,
                isActive: res.isActive
            }
            return cb(responseUtilities.responseStruct(400, "Email ID Already Exist Please Verify/Update details", "validateEmail", sendData, data.req.signature));  
        }
        return cb(responseUtilities.responseStruct(400, "User Not exists", "validateEmail", null, data.req.signature));
    })
};
const validatePassword = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    if (!data.password || !data.repeat) {

        return cb(responseUtilities.responseStruct(400, "Missing or Invalid Params", "validatePassword", null, data.req.signature));
    }
    if (data.password !== data.repeat) {

        return cb(responseUtilities.responseStruct(400, "Password and Repeat Password must be same", "validatePassword", null, data.req.signature));
    }
    if (!utilities.validatePassword(data.password)) {
        return cb(responseUtilities.responseStruct(400, "Password Too Weak", "validatePassword", null, data.req.signature));
    }
    return cb(null, responseUtilities.responseStruct(200, null, "validatePassword", null, data.req.signature));

};


const checkUserName = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    if (!data.userName || !data.email) {
        return cb(responseUtilities.responseStruct(400, null, "checkUserName", null, data.req.signature));
    }

    let where = {
        userName: data.userName
    }

    Users.findOne(where, function (err, res) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "validateEmail", null, data.req.signature));
        }
        
        if(res){
            if(data.email && (res.email == data.email)){
                return cb(null, responseUtilities.responseStruct(200, null, "checkUserName", null, data.req.signature));
            }
            return cb(responseUtilities.responseStruct(400, "UserName Already Exist", "checkUserName", null, data.req.signature));  
        }
        return cb(null, responseUtilities.responseStruct(200, null, "checkUserName", null, data.req.signature));
    })
};

exports.checkUserName = checkUserName

const generateAccountId = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    let forwardData 
    if (response) {
        forwardData = response;
    }

    Users.find({ accountId: 1 }, function (err, usedAccountIds) {
        if (err) {
            console.error(err)
            return cb(responseUtilities.responseStruct(500, null, "generateAccountId", data.req.signature));
        }
        let usedList = usedAccountIds;
        let x = true;
        let accountId = 0;
        while (x) {
            accountId = Math.floor(Math.random() * (99999999 - 11111111) + 11111111);
            if (usedList.indexOf(accountId) < 0) {
                x = false;
            }
        }
        forwardData.accountId = accountId;
        return cb(null, responseUtilities.responseStruct(200, null, "generateAccountId", forwardData, data.req.signature));
    })
};

const insertUser = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    let hash = null;
    let salt = null;
    let accountId = null;

    if (response.data) {
        hash = response.data.hash;
        salt = response.data.salt;
        accountId = response.data.accountId;
    }
    if (!hash || !salt || !accountId) {
        console.error("no hash/salt/accountId");
        return cb(responseUtilities.responseStruct(500, "no hash/salt/accountId", "insertUser", null, data.req.signature));
    }

    let updateData = data;
    updateData.name = data.name;
    updateData.about = data.about;
    updateData.firstName = data.firstName;
    updateData.lastName = data.lastName;
    updateData.password = hash;
    updateData.salt = salt;
    updateData.accountId = accountId;
    updateData.isActive = true;

    let ip = data.ip;
    let countryCode = 'IN';
    let countryName = 'INDIA';
    let timezone = 'Asia/Kolkata'
    if (process.env.DEV == 'false') {
        countryCode = geoip.lookup(`${ip}`).country;
        countryName = countryList.getName(`${countryCode}`);
        timezone = geoip.lookup(`${ip}`).timezone
        
    }
    updateData.userMeta = {
        countryCode : countryCode,
        countryName : countryName,
        timezone : timezone,
        ip:ip,
        mobile: data.mobile,
        mobileCode: data.mobileCode,
        profilePicture: data.profilePicture
    }

    let findData = {
        email: data.email
    }
    let options ={
        upsert:true,
        new:true,
        setDefaultsOnInsert:true
    }
    Users.findOneAndUpdate(findData,updateData, options,function (err, res) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "insertUser", null, data.req.signature));
        }
        return cb(null, responseUtilities.responseStruct(200, "You have successfully Joined. Please Login.", "insertUser", res, data.req.signature));
    });

};

const userLoginAsync = function (data, response, cb) {
    if (!data.email || !data.password) {
        return cb(responseUtilities.responseStruct(400, "Email and Password are required", "user_login", null, data.req.signature));
    }

    data.role = response.data.role;
    data._id = response.data._id;
    data.provider = response.data.provider;
    userLogin(data, cb);
};

const userLogin = function (data, cb, isVerified) {
    if (!data.email || !data.password) {
        return cb(responseUtilities.responseStruct(400, "Email and Password are required", "userLogin", null, data.req.signature));
    }

    let functionsWaterfall = [];
    functionsWaterfall.push(async.apply(utilities.readUserByKeyValue, data));
    if (isVerified && (isVerified === "NOT_VERIFIED")) {
        functionsWaterfall.push(async.apply(comparePassword, data));
    }
    functionsWaterfall.push(async.apply(encryptData, data));
    functionsWaterfall.push(async.apply(addLoginStats, data));


    async.waterfall(functionsWaterfall, cb);
};

exports.userLogin = userLogin;

const encryptData = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    let timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    let userData = {
        id: data._id,
        email: data.email,
        accountId: data.accountId,
        name: data.name,
        role: data.role,
        createdAt: timestamp,
        tokenType: "auth",
    };

    utilities.encryptData(userData, function (err, cipher) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "encryptData", null, data.req.signature));
        }
        return cb(null, responseUtilities.responseStruct(200, "Successfully Logged In!", "encryptData", {
            user: {
                email: data.email,
                name: data.name,
                accountId: data.accountId,
                provider:data.provider,
            },
            token: cipher
        }, data.req.signature));
    });
};

const addLoginStats = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    let timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    let countryCode = 'IN';
    let countryName = 'INDIA';
    let timezone = 'Asia/Kolkata'
    if (process.env.DEV == 'false') {
        countryCode = geoip.lookup(`${ip}`).country;
        countryName = countryList.getName(`${countryCode}`);
        timezone = geoip.lookup(`${ip}`).timezone
        
    }
    let insertData = {
        userId: data._id,
        userIp: data.ip,
        deviceType: data.device,
        browser: data.browser,
        countryCode: countryCode,
        countryName: countryName,
        timezone: timezone,
        token: response.data.token,
        lastLoginTime: timestamp
    };
    

    LoginStats.create(insertData, function (err, cipher) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "addLoginStats", null, data.req.signature));
        }
        return cb(null, responseUtilities.responseStruct(200, "Successfully Logged In!", "addLoginStats", response.data, data.req.signature));
    });
};

const comparePassword = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    let hash = null
    let salt = null
    if (response.data) {
        hash = response.data.password;
        salt = response.data.salt;
    } else {
        console.error("no hash");
        return cb(responseUtilities.responseStruct(500, null, "comparePassword", null, data.req.signature));
    }

    //use in resetPassword
    if (data.oldPassword) {
        data.password = data.oldPassword;
    }

    utilities.comparePassword(data.password, hash, salt, function (err, hash_result) {
        if (err) {
            console.error(err)
            return cb(responseUtilities.responseStruct(500, null, "comparePassword", null, data.req.signature));
        }

        if (hash_result === true) {
            data._id = response.data._id
            data.accountId = response.data.accountId
            data.name = response.data.name
            data.role = response.data.role
            data.provider = response.data.provider
            data.twoFactorAuth = response.data.twoFactorAuth


            if(response.data.twoFactorAuth){
                return cb(responseUtilities.responseStruct(428, "Verify 2fa first", "comparePassword", {
                    user: {
                        email: data.email,
                        name: data.name,
                        accountId: data.accountId,
                        provider:data.provider,
                        twoFactorAuth:response.data.twoFactorAuth
                    },
                    token: null
                }, data.req.signature));
            }

            //use in resetPassword
            if (data.oldPassword) {
                return cb(null, responseUtilities.responseStruct(200, "Password Updated Successfully", "comparePassword", data, data.req.signature));
            }

            return cb(null, responseUtilities.responseStruct(200, "Username - Password Matches", "comparePassword", data, data.req.signature));
        } else {
            //use in resetPassword
            if (data.oldPassword) {
                return cb(responseUtilities.responseStruct(400, "Invalid Old Password.", "comparePassword", null, data.req.signature));
            }
            return cb(responseUtilities.responseStruct(401, "Invalid ID and Password Combination.", "comparePassword", null, data.req.signature));
        }
    });
};

const forgotPassword = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    let waterfallFunctions = [];

    waterfallFunctions.push(async.apply(validateUser, data));
    waterfallFunctions.push(async.apply(checkResetPasswordsRequest, data));
    // waterfallFunctions.push(async.apply(sendForgotPasswordLink, data));

    async.waterfall(waterfallFunctions, cb);
};

exports.forgotPassword = forgotPassword;

const validateUser = function (data, response, cb) {

    if (!cb) {
        cb = response;
    }
    if (!data.email) {
        return cb(responseUtilities.responseStruct(400, "Missing Email Address", "validateUser", null, data.req.signature));
    }
    if (!utilities.validateEmail(data.email)) {
        return cb(responseUtilities.responseStruct(400, "Invalid Email Address", "validateUser", null, data.req.signature));
    }

    let findData = {
        email: data.email,
        emailVerified: true,
        isBlocked: false,
        isActive: true
    }

    Users.findOne(findData, function (err, res) {

        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "validateUser", null, data.req.signature));
        }
        if (res) {
            if (res.provider == 'email') {
                data.user = res;
                return cb(null);
            }
            return cb(responseUtilities.responseStruct(400, "You are LoggedIn using social networks", "validateUser", null, data.req.signature));
        }
        return cb(responseUtilities.responseStruct(400, "Email is not registered", "validateUser", null, data.req.signature))

    })
};

exports.validateUser = validateUser;

const checkResetPasswordsRequest = function (data, response, cb) {

    if (!cb) {
        cb = response;
    }
    let findData = {
        email: data.email,
        isActive: true,
        isExpired: false,
        expiryTime: { $gt: new Date().getTime() }
    }

    ResetPasswords.findOne(findData, function (err, res) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "checkResetPasswordsRequest", null, data.req.signature));
        }

        if (!res) {
            const insertData = {
                email: data.email,
                isActive: true,
                ip: data.ip,
                device: data.device,
                browser: data.browser
            }
            ResetPasswords.create(insertData, function (err, newPassReq) {
                if (err) {
                    return cb(responseUtilities.responseStruct(500, null, "checkResetPasswordsRequest", null, null));
                }

                data.token = btoa(newPassReq._id.toString());
                console.log("Token", data.token);
                return cb(null,responseUtilities.responseStruct(200, "Verified Link created", "checkResetPasswordsRequest", null, null));
            })
        } else {
            data.token = btoa(res._id.toString());
            console.log("Token", data.token);

            return cb(null,responseUtilities.responseStruct(200, "Verified Link created", "checkResetPasswordsRequest", null, null));
        }
    })
};

exports.checkResetPasswordsRequest = checkResetPasswordsRequest;

const sendForgotPasswordLink = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    data.resetLink = process.env.CLIENT_URL + `/auth/change-password/${data.token}`;
    console.log('Link To reset', data.resetLink);
    email.sendOtpEmailForgotPasswordLink(data, function (err, response) {
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "sendForgotPasswordLink", null, data.req.signature));
        }

        return cb(null, responseUtilities.responseStruct(200, "Verified Link send", "sendForgotPasswordLink", null, data.req.signature));
    });
};

exports.sendForgotPasswordLink = sendForgotPasswordLink;

const forgotVerifyLink = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    async.waterfall([
        async.apply(checkLink, data),
    ], cb);
}
exports.forgotVerifyLink = forgotVerifyLink;

const checkLink = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    if (!data.token) {
        return cb(responseUtilities.responseStruct(400, "Missing Params", "checkLink", null, data.req.signature));
    }

    const ResetPasswordsId = atob(data.token);
    // console.log("ll ", ResetPasswordsId);
    data.ResetPasswordsId = ResetPasswordsId;

    if (!mongoose.isValidObjectId(ResetPasswordsId)) {
        console.log("Not a valid ID Error : ", ResetPasswordsId);
        return cb(responseUtilities.responseStruct(400, "Not a valid ID", "checkLink", null, data.req.signature));
    }

    ResetPasswords.findById(ResetPasswordsId, function (err, res) {
        if (err) {
            console.error("checkLink Error : ", err);
            return cb(responseUtilities.responseStruct(500, null, "checkLink", null, data.req.signature));
        }

        if (!res) {
            return cb(responseUtilities.responseStruct(400, "No request for password reset exist", "checkLink", null, data.req.signature));
        }

        if ((new Date().getTime() > res.expiryTime) || (res.isActive == false) || res.isExpired) {
            return cb(responseUtilities.responseStruct(400, "Link invalid", "checkLink", null, data.req.signature));
        }

        data.email = res.email;
        return cb(null, responseUtilities.responseStruct(200, "Link Verify", "checkLink", null, data.req.signature));

    });
}
exports.checkLink = checkLink;


const forgotChangePassword = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    if(!data.password || !data.repeat || !data.token){
        return cb(responseUtilities.responseStruct(400, "Missing Params", "forgotChangePassword", null, data.req.signature));
    }

    if(data.password != data.repeat){
        return cb(responseUtilities.responseStruct(400, "passwords do not match", "forgotChangePassword", null, data.req.signature));
    }

    // let temp = btoa(data.token);
    // data.token = temp;

    //data.token = atob(data.token);

    let waterfallArray = [];

    waterfallArray.push(async.apply(checkLink,data));
    waterfallArray.push(async.apply(validateUser,data));
    waterfallArray.push(async.apply(utilities.generatePassword, data.repeat)),
    waterfallArray.push(async.apply(changePassword, data));

    async.waterfall(waterfallArray, cb);
}
exports.forgotChangePassword = forgotChangePassword;

const changePassword = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    let { hash, salt } = response;

    if (!hash || !salt) {
        return cb(responseUtilities.responseStruct(400, "No salt/hash provided", "forgotChangePassword", null, data.req.signature));
    }

    let findData = {
        email: data.email
    }
    let updateData = {
        password: hash,
        salt: salt,
        updatedAt: Date.now(),
    }

    Users.updateOne(findData, updateData, function (err, res) {
        if (err) {
            console.log("changePassword : ", err);
            return cb(responseUtilities.responseStruct(500, null, "changePassword", null, data.req.signature));
        }

        findData = data.ResetPasswordsId
        updateData = {
            isActive: false,
            isExpire: true,

        };

        ResetPasswords.findByIdAndUpdate(findData, updateData, function (err, res) {
            if (err) {
                console.log("changePassword.ResetPasswords : ", err);
                return cb(responseUtilities.responseStruct(500, null, "changePassword", null, data.req.signature));
            }

            return cb(null, responseUtilities.responseStruct(200, "Password Changed successfully", "checkLink", null, data.req.signature));
        });
    });
}

const resetPassword = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    if (!data.newPassword || !data.confirmPassword || !data.oldPassword) {
        return cb(responseUtilities.responseStruct(400, null, "resetPassword", null, data.req.signature));
    }

    if (data.newPassword != data.confirmPassword) {
        return cb(responseUtilities.responseStruct(400, "passwords do not match", "resetPassword", null, data.req.signature));
    }

    data.id = mongoose.Types.ObjectId(data.req.auth.id)

    let functionsWaterfall = [];
    functionsWaterfall.push(async.apply(utilities.readUserByKeyValue, data));
    functionsWaterfall.push(async.apply(comparePassword, data));
    functionsWaterfall.push(async.apply(utilities.generatePassword, data.newPassword));
    functionsWaterfall.push(async.apply(updateUserPassword, data));

    async.waterfall(functionsWaterfall,cb);

}
exports.resetPassword = resetPassword;

const updateUserPassword = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    let {hash,salt} = response;

    if(!hash || !salt){
        return cb(responseUtilities.responseStruct(400, "missing hash/salt", "updateUserPassword", null, data.req.signature));
    }

    let findData = data._id;

    let updateData = {
        password:hash,
        salt
    }

    // console.log(updateData)

    Users.findByIdAndUpdate(findData,updateData,(err,res) => {
        if (err) {
            console.log("updateUserPassword : ", err);
            return cb(responseUtilities.responseStruct(500, null, "updateUserPassword", null, data.req.signature));
        }

        return cb(null, responseUtilities.responseStruct(200, "Password Changed successfully", "updateUserPassword", null, data.req.signature));
    })
}
exports.updateUserPassword = updateUserPassword;


exports.verifyCaptcha = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    if (!data.captchaResponse) {
        return cb(responseUtilities.responseStruct(400, null, "verifyCaptcha", null, data.req.signature));

    }
    console.log('----Captcha response', data.captchaResponse)
    let token = data.captchaResponse;
    let secretKey = process.env.CAPTCHA_VERIFICATION_KEY; //the secret key from your google admin console;
       
    const url =  `${process.env.CAPTCHA_BASE_URL}?secret=${secretKey}&response=${token}`;
  
    axios.post(url, function(err, response, body){
        if(err){
            console.log(err);
            return cb(responseUtilities.responseStruct(500, null, "verifyCaptcha", null, data.req.signature));

        }

        console.log('-----', body)

        body = JSON.parse(body);
        if(body.success !== undefined && !body.success){
            return cb(responseUtilities.responseStruct(400, 'Invalid Captcha/ Unable to verify', "verifyCaptcha", null, data.req.signature));

        }
        return cb(null,responseUtilities.responseStruct(200, 'Captcha verified', "verifyCaptcha", null, data.req.signature));
     
    });
 };
 