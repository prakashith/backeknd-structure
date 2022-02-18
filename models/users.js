let mongoose = require('./db');

// grab the things we need
let Schema = mongoose.Schema;

// create a schema
let userSchema = new Schema({
    userName: String,
    about: String,
    name: String,
    firstName: String,
    lastName: String,
    email: {type:String,unique: true},
    role: {
        type:String,
        enum:{values:process.env.ROLE.split(','), message:"ROLE ENUM FAILED"},
        default: 'USER'
      },
    accountType: String,
    accountId: Number,
    password: String,
    salt: String,
    provider: {
        type: String,
        default: 'email'
    },
    socialDetails: {type:Object},
    userMeta:{
        ip: String,
        countryName: String,
        countryCode: String,
        mobile: String,
        mobileCode: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        profilePicture: String
    },
    emailVerified: {type: Boolean, default: false},
    isActive:{type:Boolean, default: false},
    isBlocked:{type:Boolean, default: false}
},{ timestamps: true });

// we need to create a model using it
let users = mongoose.model('users', userSchema);

module.exports = users;