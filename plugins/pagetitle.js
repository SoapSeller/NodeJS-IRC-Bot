/**
 * Page Title Plugin
 *
 * @author		Dor Shahaf
 * @website		http://dor.shahaf.com
 * @copyright	Dor Shahaf 2011
 */
var sys = require( 'util' );

//var request = require('ahr'), // Abstract-HTTP-request https://github.com/coolaj86/abstract-http-request
events = require('events'),	// EventEmitter
jsdom = require('jsdom');	// JsDom https://github.com/tmpvar/jsdom

http = require('http');
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
    
    if (!u.protocol || u.protocol == "http:") {
      console.log(u);
      try {
        http.get({host: u.host, port: (u.port || 80), path: (u.path || "/")}, function(res) {
          if (res.statusCode != 200) {
            console.log(res);
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
            res.setEncoding('utf8');
            var html = "";
            res.on('data', function(chunk) { html += chunk; });
            res.on('end', function() {
              try {
              var window = jsdom.jsdom(html).createWindow();

              self.irc.channels[c].send( window.document.title + " ( " + origUrl +" )");
              } catch(err) {
               console.log("error in parsing: " + err);
              }
            });
          }
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

	
