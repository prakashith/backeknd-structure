const mailgun = require('mailgun-js')({ apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN });
const projectName = 'Backend Core';
// Mailgun function

let sendMail = function(from, to, subject, message, cb) {

    const data = {
        from: from,
        to: to,
        // cc: 'baz@example.com',
        // bcc: 'bar@example.com',
        subject: subject,
        text: message,
        html: message,
        // attachment: attch
    };

    mailgun.messages().send(data, (error, body) => {
        if (error) {
            return cb(error, null);
        }
        return cb(null, body);
    });
}


exports.sendAuthOtp = function(data, response, cb) {

    if(!cb){
        cb = response;
    }

    let user = {
        email: data.email
    };
    let generatedOTP = data.otp
    var hostUrl = process.env.EMAIL_HOST
  
    let subject = `OTP ${projectName}`;
    let from = process.env.EMAIL_HOST;
    let to = `${user.email}`;
    let message = `${hostUrl}, email:${user.email}, otp:${generatedOTP}`

    console.log(message)

    sendMail(from, to, subject, message, function(error, data) {
        if (error) {
            return cb(error);
        }
        return cb(null, data);
    })
};