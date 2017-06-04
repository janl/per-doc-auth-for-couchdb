const Hapi = require('hapi')
const h2o2 = require('h2o2')
const Hoek = require('hoek')
const Boom = require('boom')

module.exports.start = function (options, callback) {
  const server = new Hapi.Server({
    debug: {
      log: ['error', 'request'],
      request: ['error', 'requested', 'request']
    }
  })
  server.connection(options.connection)

  const mapUri = (request, response) => {
    if (!request.headers.authorization) {
      return response(Boom.unauthorized('Missing authorization header'))
    }
    response(null, options.couchdb + request.url.path)
  }

  server.register([
    h2o2
  ], (registerError) => {
    Hoek.assert(!registerError, registerError)

    server.route({
      method: '*',
      path: '/authtest/{path*}',
      config: {
        payload: {
          output: 'stream',
          parse: false
        }
      },
      handler: function proxyHandler (request, reply) {
        return reply.proxy({
          passThrough: true,
          mapUri: mapUri
          // onResponse: function (error, response, req, reply) {
          //   console.log('in on response')
          //   Hoek.assert(!error, error)
          //   reply(response)
          // }
        })
      }
    })

    server.start((startError) => {
      Hoek.assert(!startError, startError)
      callback(null, server)
    })
  })
}
