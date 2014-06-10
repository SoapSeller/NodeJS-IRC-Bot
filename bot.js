/**
 * IRC Bot
 *
 * @author		Michael Owens
 * @website		http://www.michaelowens.nl
 * @copyright	Michael Owens 2011
 */
var sys = require('util'),
	irc = require('./irc');

/**
 * Config
 */
var config = {
	host:		'irc.freenode.com',
	port:		6667,
	nick:		'NodeBot',
	username:	'NodeBot',
	ssl:            'false',
	realname:	'Powered by Michael Owens',
	channels:	['#nodejs'],
	command:	'.',
	debug:		false,

	plugins:	['global', 'reload', 'gezien', 'textfilter']
};

/**
 * Let's power up
 */
var ircClient = new irc.Server(config);
ircClient.connect();
