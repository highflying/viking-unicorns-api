var restify = require('restify');
var ConnectSdk = require("connectsdk");
var iPoolOAuth = require("./oauth-1-0a");
var search = require('youtube-search');
var csv        = require("csv");
var request = require("request");
 
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

server.get('/images/:q?', function(req, res, next){
  var what = req.params.q || 'cats';
  
  var connectSdk = new ConnectSdk (
    process.env.ConnectSDK_ApiKey,
    process.env.ConnectSDK_ApiSecret,
    process.env.ConnectSDK_UserName,
    process.env.ConnectSDK_UserPassword);
    
    var search = connectSdk
    .search()
    .images()
    .withPage(1)
    .withPageSize(10)
    .withPhrase(what)
    ;
    
    return search.execute(function(err, response) {
      if (err) {
        console.error(err);
        res.send({});
        return next();
      }

      var randomIndex = Math.ceil(Math.random() * (response.images.length-1));
      res.send(response.images[randomIndex]);

      return next();
    });
    

});

server.get('/youtube/:q?', function(req, res, next){
  var what = req.params.q || 'cats';
  
  // var params = {
  //     part: 'snippet',
  //     maxResults: 50,
  //     order: 'viewCount',
  //     q: what,
  //     chart: 'mostPopular',
  //     auth: process.env.YouTube_ApiKey
  // };
  
  
  // googleapis.youtube('v3').videos.list(params, function(err, resp) {
  //   if (err) {
  //     console.log('An error occured', err);
  //     return;
  //   }
  //   // Got the response from custom search
  //   console.log('Result: ' + resp.searchInformation.formattedTotalResults);
  //   if (resp.items && resp.items.length > 0) {
  //     console.log('First result name is ' + resp.items[0].title);
  //   }
    
  //   return next();
  // });


  
  var opts = {
    maxResults: 10,
    key: process.env.YouTube_ApiKey
  };
   
  search(what, opts, function(err, results) {
    if(err) return console.log(err);
    var vid_index = Math.ceil(Math.random() * (results.length-1));
    var vid = results[vid_index];
    vid["id"] = youtube_parser(vid.link);
    vid["embed"] = "<iframe width='560' height='315' src='" + vid.link + "' frameborder='0' allowfullscreen></iframe>";
    res.send(vid);
    return next();
  });
    
});

function youtube_parser(url){
    var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match&&match[7].length==11){
        return match[7];
    }else{
        alert("Url incorrecta");
    }
}

var translations = {
  cats: 'katzen',
  cat: 'katzen',
};

server.get("/article/:q?", function (req, res, next) {
  var tag = req.params.q || 'cats';

  if(translations[tag]) {
    tag = translations[tag];
  }

  var oauth = new iPoolOAuth({
    consumer: {
      public: process.env.IPOOL_PUBLIC,
      secret: process.env.IPOOL_SECRET,
    }
  });

  var request_data = {
    url: "https://ipool.s.asideas.de/api/v3/search",
    method: 'GET',
    data: {
      q:tag,
      limit: 100
    }
  };

  var headers = oauth.toHeader(oauth.authorize(request_data));

  var client = restify.createJsonClient({
    url: "https://ipool.s.asideas.de",
    headers: headers,
  });

  client.get("/api/v3/search?q=" + encodeURIComponent(tag) + "&limit=" + request_data.data.limit, function (err, apiReq, apiRes, data) {
    if(err || !data) {
      res.send({});
      return next();
    }

    var count = data.documents.length;

    var doc;
    var n = 0;
    while(!doc && n <= 100) {
      n++;
      var i = parseInt(Math.random() * count);
      if(data.documents[i].type === "article") {
        doc = data.documents[i]; 
      }
    }

    var article = {
      title: doc.title || "",
      subtitle: doc.subtitle || "",
      content: doc.content || "",
      leadtext: doc.leadtext || "",
      date: new Date(doc.dateCreated),
      url: "http://" + doc.publishedURL,
      // src: doc,
    };


    var request = require('request');
    request(article.url, function (error, response, body) {
      if (error || response.statusCode !== 200) {
        console.error(error);
        res.send(article);
        return next();
      }

      var matches = /<meta property="og:image" content="([^"]+?)"\/>/.exec(body);
      if(matches) {
        article.imageUrl = matches[1];
      }
      res.send(article);
      return next();
    });
  });
});


server.get('/adverts/:q?', function(req, res, next){
  var what = req.params.q || 'cats';

  if(translations[what]) {
    what = translations[what];
  }

  var client = restify.createStringClient({
    url: "http://adzeile.ladenzeile.de"
  });
  
// GET request to: adzeile.ladenzeile.de/adzeile
// with the following GET params: 
// 1- ad=ad-1D8B6F8CB4AB
// 2- format=csv
// 3- items=8
// 4- kw=kleider
// 5- subid=
// 6- r=http://www.ladenzeile.de
// what = "kleider";
  var params = "ad=ad-1D8B6F8CB4AB&format=csv&items=8&kw=" + encodeURIComponent(what) + "&subid=&r=http://www.ladenzeile.de";

  var url = "/adzeile?" + params;

  client.get(url, function (err, apiReq, apiRes, csvText) {

    if(err) {
      res.send({});
      return next();
    }

    csv.parse(csvText, {trim: true}, function(err, data){

      var headers = data.shift();


      headers = headers.map(function (header) {
        return header.replace(' ', '_');
      });

      var json = {
        adverts: [],
      };

      data.forEach(function(row) {
        var advert = {};
        for(var i = 0; i < headers.length; i++) {
          advert[headers[i]] = row[i];
        }

        json.adverts.push(advert);
      });

      res.send(json);

      return next();
    });
  });
});


server.listen(process.env.PORT || 8080, function () {
  console.log('%s listening at %s', server.name, server.url);
});
