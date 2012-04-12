/**
 * Page Title Plugin
 *
 * @author		Dor Shahaf
 * @website		http://dor.shahaf.com
 * @copyright	Dor Shahaf 2011
 */
var sys = require( 'util' );

//var request = require('ahr'), // Abstract-HTTP-request https://github.com/coolaj86/abstract-http-request
//jsdom = require('jsdom');	// JsDom https://github.com/tmpvar/jsdom

http = require('http');
https = require('https');
url  = require('url');

var jQueryPath = 'http://code.jquery.com/jquery-1.4.2.min.js';
var headers = {'content-type':'application/json', 'accept': 'application/json'};
String.prototype.trim=function(){return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');};

String.prototype.ltrim=function(){return this.replace(/^\s+/,'');}

String.prototype.rtrim=function(){return this.replace(/\s+$/,'');}

String.prototype.fulltrim=function(){return this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');}

Plugin = exports.Plugin = function( irc ) {
	
	this.name = 'pagetitle';
	this.title = 'Get the title of a web page';
	this.version = '0.1';
	this.author = 'Dor Shahaf';
	
	this.irc = irc;
	
	this.regex = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
  this.titleRegex = /<title(.*)>((.|\n)*)<\/title>/i;

  this.userAgent = "Mozilla/5.0 (X11; Linux x86_64; rv:11.0) Gecko/20100101 Firefox/11.0";

  this.last = "";

  var self = this;

  this.handleUrl = function(toParse, c, origUrl, retry) {
    if (self.last == toParse) { return; }
    self.last = toParse;
    if(!origUrl) { origUrl = toParse; }
    
    // Protect aginst too many redirects
    if (!retry) { retry = 10; }
    if (--retry < 0) { return; }

    var u = url.parse(toParse);
    
    if (!u.protocol || u.protocol == "http:" || u.protocol == "https:") {
      console.log(u);
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
            res.setEncoding('utf8');
            var html = "";
            res.on('data', function(chunk) { html += chunk; });
            res.on('end', function() {
              try {
                // var window = jsdom.jsdom(html).createWindow();
                // var title = window.document.title;
                
                var titleM = html.match(self.titleRegex);

                if (titleM && (titleM.length > 1)) {
                  var title = titleM[2];

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
                  self.irc.channels[c].send( title + " ( " + origUrl +" )");
                } else {
                  console.log(html);
                }
              } catch(err) {
               console.log("error in parsing: " + err);
              }
            });
          }
        }).on('error', function(e) {
          console.log("Got error: " + e.message);
          self.irc.channels[c].send("Invalid address ( " + origUrl +" )");
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
  console.log(ms);
  for (i in ms) {
    var m = ms[i].fulltrim();
    if (m.indexOf("http") != 0) {
      m = "http://" + m;
    }

    try {
      self.handleUrl(m, c);
    } catch (err) {
      console.log("General error in handleUrl: " + err);
    }

  }
};

	
