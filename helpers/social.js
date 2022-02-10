const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
// google init
passport.use(new GoogleStrategy({
    clientID:`${process.env.GOOGLE_CLIENT_ID}`,
    clientSecret:`${process.env.GOOGLE_CLIENT_SECRET}`,
    callbackURL:'/auth/v1/google/callback'
},
  function(accessToken, refreshToken, profile, done){

    let data = {
      profile:profile,
      accessToken:accessToken
    }

    passport.serializeUser(function(data, done) {
      done(null, data);
    }),
    
    passport.deserializeUser(function(data, done) {
      done(null, data);
    })
    return done(null, data);
  }
));
