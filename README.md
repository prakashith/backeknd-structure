## Backend Structure

# Folder Structure:
```
├── bin
│   ├── www.js
├── config
│   ├── development.js
│   ├── index.js
│   ├── production.js
├── controllers
│   ├── `${moduleName}`.js
├── helpers
│   ├── `${reusable service}`.js
├── middlewares
│   ├── authenticator.js
│   ├── authenticateRole.js
│   ├── formatRequest.js
├── models
│   ├── `${collectionName}`.js
├── routes
│   ├── `${moduleName}`.js
├── seeds
│   ├── `${initialSeedFile}`.js
├── views
├── app.js
├── server.js
├── package.json
├── README.md
├── VERSIONS.md
```
## Description
This portal Descriptions.
## Prerequisites
Make sure you have installed all of the following prerequisites on your development machine:
Git - Download & Install Git. OSX and Linux machines typically have this already installed.
Version 2.33.0.
Node.js - Download & Install Node.js and the npm package manager. If you encounter any problems, you can also use this GitHub Gist to install Node.js.
Version 16.13.0
MongoDB - Download & Install MongoDB, and make sure it's running on the default port (27017)
Version MongoDB 4.4

## version 0.0.1
View Previous Versions [linky](./VERSIONS.md)
## Get Started

Get started developing...

## Clone the project
Clone the project.

```shell
git clone https://github.com/prakashith/backend-structure.git
```

## Latest Branch
Checkout to latest branch: "development"

```shell
git checkout development
```

## Install Dependencies

Install all package dependencies (one time operation)

```shell
npm install
```
## Run It
#### Run in *development* mode:
Runs the application is development mode. Should not be used in production

```shell
npm start
```

#### Run in *production* mode:

Compiles the application and starts it in production production mode.

```shell
NODE_ENV=production npm start
```
## Documentation

* Open you're browser to [http://localhost:7000](http://localhost:7000)
* Run api described in swagger doc
* Invoke the `/examples` endpoint 
  ```shell
  curl http://localhost:7000/api/v1/examples
  ```
  
## Config
* find all pre-dependencies in config folder
* Change the Following domain settings as per requirements
## Authors

* ITH Technologies