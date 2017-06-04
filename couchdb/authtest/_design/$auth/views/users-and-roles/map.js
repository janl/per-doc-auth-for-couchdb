function (doc) {
  var now = Date.now()
  doc['$access'].forEach(function (user_role) {
    emit([user_role, now])
  }
}
