'use strict';

const config = require('../config/index');
const crypto = require('crypto');
const User = require('../models/users');
const Countries = require('../models/countries');

const salt = crypto.randomBytes(16).toString('base64')
const randomSalt = Buffer(salt,'base64');
const { Country, State, City } = require('country-state-city');
const { Kinesis } = require('aws-sdk');


let insertUser = [
  {
    _id:"601e3c6ef5eb242d4408dcc5",
    name:"superadmin",
    email:"superadmin@ith.tech",
    accountId: "12345678",
    provider: "email",
    role: 'SUPER_ADMIN',
    userName: 'super_admin_seed',
    password: crypto.pbkdf2Sync('123456789', randomSalt, 10000, 64, 'sha1').toString('base64'),
    salt: salt,
    emailVerified:true,
    isActive:true
  },
  {
    _id:"601e3c6ef5eb242d4408dcc6",
    name:"admin",
    email:"admin@ith.tech",
    accountId: "11223344",
    provider: "email",
    role: 'ADMIN',
    userName: 'admin_seed',
    password: crypto.pbkdf2Sync('123456789', randomSalt, 10000, 64, 'sha1').toString('base64'),
    salt: salt,
    emailVerified:true,
    isActive:true
  },
  {
    _id:"601e3c6ef5eb242d4408dcc7",
    name:"user",
    email:"user@ith.tech",
    accountId: "87654321",
    provider: "email",
    role: 'USER',
    userName: 'user_seed',
    password: crypto.pbkdf2Sync('123456789', randomSalt, 10000, 64, 'sha1').toString('base64'),
    salt: salt,
    emailVerified:true,
    isActive:true
  }
]

let seedUsers = ()=>{
  User.find({}, (err, resp) => {
    if (resp.length > 0) {
      return;
    } else {
        User.create(insertUser, (err, response) => {
          if(err){
            console.log(err)
            console.error("Unable to create user");
            // process.exit(0)
  
            return
          }
          console.log("User Created");
          // process.exit(0)
          
        });
    }
  });
}

let seedCountry = function(){
  Countries.find({}, (err, resp) => {
    if (resp.length > 0) {
      return;
    } else {
      let country = Country.getAllCountries();
      let finalData = []
      for(let i in country){
        let phonecode = country[i].phonecode.split('+')
        if((phonecode.length == 1) && (phonecode[0].length == 0)){
          console.log(country[i],"Skipped Countries")
          continue
        }
        if(phonecode.length > 1){
          phonecode = phonecode[1]
        }else {
          phonecode = phonecode[0]
        }
        
        country[i].phonecode = phonecode
        country[i].states = State.getStatesOfCountry(country[i].isoCode)
        country[i].cities = City.getCitiesOfCountry(country[i].isoCode)
        finalData.push(country[i])
        if(parseInt(i) == (country.length -1)){
          Countries.create(finalData,(err,res)=>{
            if(err){
              console.log(err)
            }
            console.log("Country Seeded")
          })
        }
      }
    }
  })
  
}

seedCountry()
seedUsers()