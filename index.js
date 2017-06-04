require('dotenv').config()
var bootstrap = require('couchdb-bootstrap')
var assert = require('assert')

if (!process.env.COUCHDB) {
  console.log('Missing (dot)env var `COUCHDB`, exiting.')
  return
}

console.log('Running on', process.env.COUCHDB)

console.log('Setting up CouchDB _design/$auth')

bootstrap(process.env.COUCHDB, 'couchdb', function (error, response) {
  if (error) {
    return console.log(error)
  }
  console.log('Set up of _design/$auth done:')
})
