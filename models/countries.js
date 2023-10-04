let mongoose = require('./db');

// grab the things we need
let Schema = mongoose.Schema;

var CountriesSchema = new Schema({
    isoCode: String,
    name: String,
    phonecode: String,
    flag: String,
    currency: String,
    latitude: String,
    longitude: String,
    timezones: [{type:Object}],
    states: [{type:Object}],
    cities: [{type:Object}]
},{ timestamps: true });

const countries = mongoose.model('countries', CountriesSchema);

module.exports = countries;