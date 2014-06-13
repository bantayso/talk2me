talk2me
=======

talk2me is a WebSocket chat client and server written in JavaScript, HTML, CSS and PHP. The goal is to produce a simple, secure and anonymous chat client. The only data stored is your username and room in memory on the server and is destroyed on disconnect.

Users connecting to rooms can additionally supply a secret to encrypt messages. Members of the room must also know the secret to decrypt messages. This encryption is performed on the client-side using the asmcrypt.js library.

View a demo here (usually a few revisions behind): [https://vimeo.com/94716053](https://vimeo.com/94716053)


INSTALL
=======

Install composer dependencies.

    composer.phar install

Run chat server.

    php bin/chat-server.php

Copy `www/cdn/js/example.config.js` to `www/cdn/js/config.js` and update the `webSocketUrl` and other parameters as desired.

Open `www/index.html` in a browser, login, and begin chatting.

*Note:* wss may or may not work - still working on secure connections. The only way to ensure a secure connection is to enable client-side encryption. _Please message me if you can help._

Setup Stunnel for SSL encryption for secure web sockets
========================================================

The `www/cdn/js/example.config.js` file defaults to the `ws://` protocol on port 8880.

The port used in `bin/example.config.php` and `www/cdn/js/example.config.js` are both 8880.

When you switch to using a secure websocket with protocol `wss://` you will need to change the port in `www/cdn/js/example.config.js` to 8443 if using the stunnel configuration below. On many machines edit `/etc/stunnel/stunnel.conf` and add the following. You'll need to generate a certificate if you don't have one. You can get free SSL certificates from sites like startssl.com.

    cert = /etc/apache2/ssl/cert.pem

    [talktome]
    accept = YOUR_PUBLIC_IP_ADDRESS:8443
    connect = 127.0.0.1:8880

Restart stunnel.


USAGE
=====

You can automatically login by appending a HASH to the URL. Enter any room name and username.

e.g. https://www.example.com/talk2me/#room@username



COMMAND PLUGIN
==============

To enable the command plugin copy `src/Talk2Me/example.CommandPlugin.php` to `src/Talk2Me/CommandPlugin.php`.

This plugin contains a single function `execute()` that is called for every message handled. If the message being
sent contains a command it will be parsed and handled and most likely should return immediately. If it does not
return the message will be sent to clients connected to the room.

In the example below if you send the message `/samplecommand` only you will receive a message back saying `Executing sample command`.

You must `return true` if a command was executed and you only want to send the message to `$from`.

The `execute()` function should `return false` in all other cases.

    public function execute($from, $json, $t) {
        if (preg_match("/\/samplecommand/", $json->msg)) {
            $o = array("status"=>"ok", "a"=>"message", "t"=>$t,
                    "msg"=>"Executing sample command");
            $from->send(json_encode($o));
        }
        return true;
    }

You can have any number of command that do just about anything you want. For example you might want a command such as `/weather 90210` that
will return the current forecast.

You could even implement a whole slew of admin commands. e.g. `/admin <password> broadcast-all '<message to send to all connected clients on server>'`
