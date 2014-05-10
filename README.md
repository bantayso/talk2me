talk2me
=======

A simple WebSocket chat client and server written in PHP using the Ratchet framework and JavaScript (jQuery) with users and rooms support. By design no data is ever persisted on the client or server side. Chat sessions are not persistent.



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


TODO
====
* As this is an alpha release there is much refactoring and testing to do.
* Don't allow duplicate usernames.
* Better room and username validation. Currently room and user names aren't very restrictive.
* Verify all communication is secure.
