var restify = require('restify');
var ConnectSdk = require("connectsdk");
 
var server = restify.createServer({
  name: 'myapp',
  version: '1.0.0'
});
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser());
server.use(restify.bodyParser());
 
server.get('/echo/:name', function (req, res, next) {
  res.send(req.params);
  return next();
});

server.get('/images/:q', function(req, res, next){
  var connectSdk = new ConnectSdk (
    process.env.ConnectSDK_ApiKey,
    process.env.ConnectSDK_ApiSecret,
    process.env.ConnectSDK_UserName,
    process.env.ConnectSDK_UserPassword);
    
    var search = connectSdk
    .search()
    .images()
    .withPage(1)
    .withPageSize(1)
    .withPhrase(req.params.q);
    
    search.execute(function(err, response) {
      if (err) throw err
      res.send(JSON.stringify(response.images[0]))
    });
    
    return next();

});
 
server.listen(process.env.PORT || 8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
