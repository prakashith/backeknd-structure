// Fetching the environment
const env = process.env.NODE_ENV || 'development';

// Common Environment Variables
const commonVariables = {
    
    ENCRYPT_SALT_STATIC: 'dSDFeFenyL2jaSDasdaeFenyL2jas@766sar7^^#&W^FSDBGxg7dgBGxg7dgqw3FSQ',
    ROLE : ['USER','ADMIN','SUPER_ADMIN'],
    STATUS: [200, 500, 400, 401],
    SERVICE_RPC_HOST: 'http://localhost',
    SERVICE_REST_PORT: '8000',
    SERVICE_RPC_PORT: '8500',
    CORE_USER_PORT: '8500',
    DB_ENV: 'development',
    pageLimit: 10
}

//setting the common variables
Object.keys(commonVariables).forEach((key) => {
    process.env[key] = commonVariables[key];
})

if (env === 'development') {

    const developmentEnvConfig = require('./development');
    Object.keys(developmentEnvConfig).forEach((key) => {
        process.env[key] = developmentEnvConfig[key];
    })
} else { // PRODUCTION

    const productionEnvConfig = require('./production');
    Object.keys(productionEnvConfig).forEach((key) => {
        process.env[key] = productionEnvConfig[key];
    })
}

