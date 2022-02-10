const async = require('async');
const moment = require('moment');
const mongoose = require('mongoose');

// Model
const Users = require('../models/users');


// Helpers Required in controller
const utilities = require('../helpers/security');
const responseUtilities = require('../helpers/sendResponse');


//Contoller for userTest
exports.userTest = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }
    if (!data.email) {
        return cb(sendResponse(400, "Email Missing", "userTest",null, data.req.signature));    
    }

    let findData = {
        email:data.email
    }

    Users.findOne(findData,(err,res)=>{
        if (err) {
            console.error(err);
            return cb(responseUtilities.responseStruct(500, null, "userTest", null, data.req.signature));
        }
       
        return cb(null,responseUtilities.responseStruct(200, "User Data", "userTest", res, data.req.signature));  
        

            
        
    })


};
