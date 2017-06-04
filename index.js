require('dotenv').config()

const bootstrap = require('couchdb-bootstrap')
const Hoek = require('hoek')
const server = require('./server')

if (!process.env.COUCHDB) {
  console.log('Missing (dot)env var `COUCHDB`, exiting.')
  process.exit(1)
}

console.log('Running on', process.env.COUCHDB)

console.log('Setting up CouchDB _design/$auth')

bootstrap(process.env.COUCHDB, 'couchdb', (error, response) => {
  Hoek.assert(!error, error)
  console.log('Set up of _design/$auth done')
})

const options = {
  connection: {
    host: '127.0.0.1',
    port: 7984
  },
  couchdb: process.env.COUCHDB
}

server.start(options, (error, server) => {
  Hoek.assert(!error, error)
  console.log('Server started at', server.info.uri)
})
