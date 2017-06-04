function (newDoc, oldDoc, ctx) {
  var hasUserName = function () {
    return newDoc.$access.indexOf(ctx.name) !== -1
  }

  var hasRole = function () {
    for(idx = 0; idx < ctx.roles.length - 1; idx++) {
      if (newDoc.$access.indexOf(ctx.roles[idx]) !== -1) {
        return true
      }
    }
    return false
  }

  if (!newDoc.$access && !isArray(newDoc.$access)) {
    throw({forbidden: 'All docs must have `$access` property as an array'})
  }

  if (!hasUserName() && !hasRole()) {
    throw({forbidden: 'You have to add your username or one of your roles to the `$access` array'})
  }
}
