/**
 * Page Title Plugin
 *
 * @author		Dor Shahaf
 * @website		http://dor.shahaf.com
 * @copyright	Dor Shahaf 2011
 */
var sys = require( 'util' );

http     = require('http');
https    = require('https');
url      = require('url');
entities = require("entities");
iconv    = require('iconv-lite');

var jQueryPath = 'http://code.jquery.com/jquery-1.4.2.min.js';
var headers = {'content-type':'application/json', 'accept': 'application/json'};
String.prototype.trim=function(){return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');};

String.prototype.ltrim=function(){return this.replace(/^\s+/,'');}

String.prototype.rtrim=function(){return this.replace(/\s+$/,'');}

String.prototype.fulltrim=function(){return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');}

Plugin = exports.Plugin = function( irc ) {
	var self = this;

	this.name = 'pagetitle';
	this.title = 'Get the title of a web page';
	this.version = '0.1';
	this.author = 'Dor Shahaf';
	
	this.irc = irc;
	
	this.regex = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
  this.irc.checkForLink = function(message) {
    return !!(message.match(self.regex));
  };

  //this.titleRegex = /<title(.*)>((.|\n)*)<\/title>/i;
  this.titleRegex = />([^<]*)<\/title/i;

  this.userAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:11.0) Gecko/20100101 Firefox/11.0";

  this.last = "";

  this.handleUrl = function(toParse, c, origUrl, retry) {
    if(!origUrl) { origUrl = toParse; }
    
    // Protect aginst too many redirects
    if (!retry) { retry = 10; }
    if (--retry < 0) { return; }

    var u = url.parse(toParse);
    
    if (!u.protocol || u.protocol == "http:" || u.protocol == "https:") {
      //console.log(u);
      try {
        var req = {};

        var options = { host: u.host,
                        path: (u.path || "/"),
                        headers: { 'User-Agent': self.userAgent } };

        var requester = {};
        if (u.protocol == "http:") {
          options.port = (u.port || 80);
          requester = http;
        } else {
          requester = https;
        }

        req = requester.get(options, function(res) {
          try {
            if (res.statusCode != 200) {
              if (res.headers.location && res.headers.location.length > 0) {
                var l = res.headers.location;
                if (l.indexOf("http") < 0) {
                  if (l[0] == "/") {
                    l = u.protocol + "//" + u.host + l;
                  } else {
                    l = u.href + "/" + l;
                  }
                }
                self.handleUrl(l, c, origUrl, retry);
              } else {
                console.log("Wrong status code: " + res.statusCode);
                console.log(res); 
              }
            } else {
              if (res.headers['content-type'].indexOf("text/html") != 0) {
                console.log("request is not for html page, aborting"); 
                req.abort();
                return;
              }
             
              var charset = 'utf8';
              var cTypeSplt = res.headers['content-type'].split(';');
              if (cTypeSplt.length > 1 && cTypeSplt[1].indexOf('charset' >= 0)) {
                charset = cTypeSplt[1].split(' ')[2];
              }
              var html = '';
              res.on('data', function(chunk) {
                if (html == null) {
                  return;
                }
                // This is somewhat optimistic(it doesn't handle cases where charchaters spans chunks),
                // but it should be alright(title usually fits in the first chunk anyway)
                html += iconv.decode(chunk, charset);

                try {
                  var titleM = html.match(self.titleRegex);

                  if (titleM && (titleM.length > 1)) {
                    var title = titleM[1];

                    var titleLines = title.split('\n');
                    if (titleLines.length > 1) {
                      title = "";
                      for (i in titleLines) {
                        title += titleLines[i].fulltrim() + " ";
                      }

                      title = title.rtrim();
                    }
                    if (title.length > 0 && title[0] == '/') {
                      title = " " + title;
                    }
                    
                    // Decode HTML chars in title
                    title = entities.decode(title);

                    //console.log(res);
                    self.irc.channels[c].send("\x02" + title + "\x02 ( \x0304" + origUrl +"\x0f )");
                    // Found end emited title, abort connection, also set html to null to block any call before the abort take place
                    html = null;
                    req.abort();
                  } 
                } catch(err) {
                 console.log("error in parsing: " + err);
                }
              });
              res.on('end', function() {
                if (html != null) {
                  console.log("coulden't find title in file:\n" + html);
                }
              });
            }
          } catch (err) {
            console.log("Error in requester handler: " + err);
          }
        }).on('error', function(e) {
          console.log("Got error: " + e.message);
          //self.irc.channels[c].send("\x02Invalid address\x02 ( \x0304\x1f" + origUrl +"\x0f )");
        });
        } catch (err) {
          console.log("error in GET: " + err);
        }
    };
  };
};

Plugin.prototype.onMessage = function( msg ) {
	
	var c = msg.arguments[ 0 ], // channel
		u = this.irc.user( msg.prefix ), // user
		text = msg.arguments[ 1 ]; // message

  var self = this;
		
  //this.irc.channels[ c ].send( '\002' + u + ':\002 Let op je taalgebruik!' );

  if (text.indexOf("levis") > 0) {
    self.irc.channels[c].send("Piss off.");
    return;
  }

  if (text.length == 0 || text[0] == "!") {
    return;
  }

  var ms = text.match(self.regex);
  if (!ms) {
    return;
  }
  //console.log(ms);
  for (i in ms) {
    var m = ms[i].fulltrim();
    if (m.indexOf("http") != 0) {
      m = "http://" + m;
    }

    try {
      // TODO: Use DB of urls...
      if (self.last == m) { return; }
      self.last = m;

      self.handleUrl(m, c);
    } catch (err) {
      console.log("General error in handleUrl: " + err);
    }

  }
};

	
