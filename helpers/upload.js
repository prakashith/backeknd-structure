const AWS = require('aws-sdk');
const uuid = require('uuid');
const utilities = require('../helpers/security');



const uploadStream = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    const s3 = new AWS.S3({
        accessKeyId:  `${process.env.AWS_ACCESS_KEY_ID}`,
        secretAccessKey: `${process.env.AWS_ACCESS_KEY_SECRET}`,
        region: `${process.env.AWS_REGION}`
    });
    
    const params = {
      Bucket: `${process.env.AWS_BUCKET}`,
      Key: uuid.v4(), 
      ContentEncoding: 'base64',
      ContentType: 'video/webm',
      ACL: 'public-read',
      Body: data.stream
    };
    
    s3.upload(params, function(err, resD){
        if(err){
            console.error(err);
            return cb(utilities.responseStruct(500, null, "uploadStream", null, null));
        
        }
        return cb(null, utilities.responseStruct(200, "uploaded stream", "uploadStream", resD, null));
    
    })
};

exports.uploadStream = uploadStream;

const uploadFile = function (data, response, cb) {
    if (!cb) {
        cb = response;
    }

    const s3 = new AWS.S3({
        accessKeyId:  `${process.env.AWS_ACCESS_KEY_ID}`,
        secretAccessKey: `${process.env.AWS_ACCESS_KEY_SECRET}`,
        region: `${process.env.AWS_REGION}`
    });
    
    const params = {
      Bucket: `${process.env.AWS_BUCKET}`,
      Key: uuid.v4(), 
      ContentEncoding: 'base64',
      ContentType: 'multipart/form-data',
      ACL: 'public-read',
      Body: data.file
    };
    
    s3.upload(params, function(err, resD){
        if(err){
            console.error(err);
            return cb(utilities.responseStruct(500, null, "uploadFile", null, null));
        
        }
        return cb(null, utilities.responseStruct(200, "uploaded files", "uploadFile", resD, null));
    
    })
};

exports.uploadFile = uploadFile;

