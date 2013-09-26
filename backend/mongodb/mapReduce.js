// Heavy update query
var cursor = db.master.find()
cursor.forEach(function(x) {
  lst = x.request.split(/ /)
  db.master.update( { _id: x._id }, { "$set" : { "method" : lst[0] }} )
  db.master.update( { _id: x._id }, { "$set" : { "url" :    lst[1] }} )
});


map = function( ) {
  var d = this.timestamp
  var dmyStr = d.getDate() + "/" + (d.getMonth()+1) + "/" + d.getFullYear()
  var rssFlag = false
  if ( this.url ) {
    if ( this.url.match( /get-rss/ )) {
      rssFlag = true
    }
  }
  key = dmyStr
  if ( rssFlag ) {
    emit( key, { count:1, rss: 1, other: 0 } )
  }
  else {
    emit( key, { count:1, rss: 0, other: 1 } )
  }
}


reduce = function( key, values ) {
  result = { count: 0, rss: 0, other: 0}
  values.forEach( function( value ) {
    result.count   += value.count
    result.rss     += value.rss
    result.other   += value.other
  })
  return result
}

db.runCommand(
  {
    mapReduce: "master",
    map: map,
    reduce: reduce,
    //query: { timestamp : { $gt : new Date( '2011/11/01' ) }},
    out: "daily"
  });


// daily by CSV
db.daily.find( ).forEach(function(x) {
  print( x._id + "\t" + x.value.rss + "\t" + x.value.other )
});


map = function( ) {
  emit( this.url, { count:1 } )
}

reduce = function( key, values ) {
  result = { count: 0 }
  values.forEach( function( value ) {
    result.count   += value.count
  })
  return result
}

db.runCommand(
  {
    mapReduce: "master",
    map: map,
    reduce: reduce,
    out: "top"
  });

db.top.ensureIndex( { "value.count" : -1 } )
db.top.find().sort( { "value.count" : -1 } ).forEach(function(x) {
  if ( x._id.match( /show-page/ )) {
    print( x._id + "\t" + x.value.count )
  }
});


// uniq user
map = function( ) {
  var d = this.timestamp
  var dmyStr = d.getDate() + "/" + (d.getMonth()+1) + "/" + d.getFullYear()
  value = {}
  value[ this.hostname ] = 1
  emit( dmyStr, value )
}

reduce = function( key, values ) {
  result = {}
  values.forEach( function ( value ) {
    for ( var k in value ) {
      result[ k ] = 1
    }
  });
  return result
},

db.runCommand(
  {
    mapReduce: "master",
    map: map,
    reduce: reduce,
    //query: { timestamp : { $gt : new Date( '2011/11/01' ) }},
    out: "uniquser"
  });

// uniq user by CSV
db.uniquser.find().forEach(function(x) {
  users = 0
  for ( k in x.value ) {
    users++
  }
  print( x._id + "\t" + users )
});