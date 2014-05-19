talk2me
=======

A simple WebSocket chat client and server written in PHP using the Ratchet framework and JavaScript (jQuery) with users and rooms support. By design no data is ever persisted on the client or server side. Chat sessions are not persistent.

View a demo here: [https://vimeo.com/94716053](https://vimeo.com/94716053)


INSTALL
=======

Install composer dependencies.

    composer.phar install

Run chat server.

    php bin/chat-server.php

Copy `www/cdn/js/example.config.js` to `www/cdn/js/config.js` and update the `webSocketUrl`.

Open `www/index.html` in a browser, login, and begin chatting.



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
