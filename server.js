#!/usr/bin/env node

var express = require('express')
var compress = require('compression')
var methodOverride = require('method-override')
var expressMongodbRest = require('./index')
var https = require('https')
var pem = require('pem')

var port = normalizePort(process.env.PORT || '3000')

var app = express()
app.use(compress())
app.use(methodOverride())
app.use('/api/v1', expressMongodbRest.Router('mongodb://localhost:27017/mydb'))
app.set('port', port)
app.set('json spaces', 2)

pem.createCertificate({days: 9999, selfSigned: true}, createServer)

function createServer(err, keys) {
    var server = https.createServer({key: keys.serviceKey, cert: keys.certificate}, app)
    server.listen(port, function() {
        var addr = server.address()
        var bind = (typeof addr === 'string') ? 'pipe ' + addr : 'port ' + addr.port
        console.info('Listening on ' + bind)
    })

    server.on('error', onError)
}

function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) return val
    return (port >= 0) ? port : false
}

function onError(err) {
    if (err.syscall !== 'listen') throw err

    var bind = (typeof port === 'string') ? 'Pipe ' + port : 'Port ' + port

    switch (err.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges')
            process.exit(1)
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use')
            process.exit(1)
            break;
        default:
            throw err
    }
}
