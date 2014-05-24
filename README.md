talk2me
=======

A WebSocket chat client and server written in JavaScript, HTML, CSS and PHP. By design messages are never logged or persisted anywhere. Minimal data about connected users is stored in memory on the server side such as room, username and connection ID.

Users connecting to rooms can additional supply a secret to encrypt messages. Members of the room must also know the secret to decrypt messages.

View a demo here: [https://vimeo.com/94716053](https://vimeo.com/94716053)


INSTALL
=======

Install composer dependencies.

    composer.phar install

Run chat server.

    php bin/chat-server.php

Copy `www/cdn/js/example.config.js` to `www/cdn/js/config.js` and update the `webSocketUrl` and other parameters as desired.

Open `www/index.html` in a browser, login, and begin chatting.

*Note:* wss may or may not work - still working on secure connections. The only way to ensure a secure connection is to enable client-side encryption. _Please message me if you can help._



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
