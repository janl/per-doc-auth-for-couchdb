const Hapi = require('hapi')
const h2o2 = require('h2o2')
const Hoek = require('hoek')
const Boom = require('boom')
const Wreck = require('wreck')
const basicAuth = require('basic-auth')

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
      method: 'GET',
      path: '/authtest',
      handler: function proxyHandler (request, reply) {
        return reply.proxy({
          passThrough: true,
          mapUri: mapUri
        })
      }
    })

    server.route({
      method: ['PUT', 'POST', 'DELETE'],
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
        })
      }
    })

    server.route({
      method: ['GET'],
      path: '/authtest/{path*}',
      handler: function proxyHandler (request, reply) {
        return reply.proxy({
          passThrough: true,
          mapUri: mapUri,
          onResponse: function (error, response, req, reply) {
            Hoek.assert(!error, error)
            // this is gnarly!
            const name = getUserNameFromRequest(req)
            readBody(response, (body) => {
              getRolesForUser(name, (roles) => {
                if (!userOrRoleCanAccess(name, roles, body)) {
                  return reply(Boom.unauthorized())
                }
                reply(body)
              })
            })
          }
        })
      }
    })

    server.start((startError) => {
      Hoek.assert(!startError, startError)
      callback(null, server)
    })
  })
}

function userOrRoleCanAccess (name, roles, body) {
  var hasUserName = function (doc) {
    if (!doc.$access) { return false }
    return doc.$access.indexOf(name) !== -1
  }

  var hasRole = function (doc) {
    if (!doc.$access) { return false }
    for (var idx = 0; idx < roles.length - 1; idx++) {
      if (doc.$access.indexOf(roles[idx]) !== -1) {
        return true
      }
    }
    return false
  }
  const res = hasUserName(body) || hasRole(body)
  return res
}

function getRolesForUser (user, callback) {
  var userDocUri = process.env.COUCHDB + '/_users/org.couchdb.user:' + user

  Wreck.get(userDocUri, { json: 'force' }, (error, response, payload) => {
    Hoek.assert(!error, error)
    callback(payload.roles)
  })
}

function getUserNameFromRequest (request) {
  return basicAuth.parse(request.headers.authorization).name
}

function readBody (response, callback) {
  Wreck.read(response, {json: 'force'}, (error, body) => {
    Hoek.assert(!error, error)
    callback(body)
  })
}
