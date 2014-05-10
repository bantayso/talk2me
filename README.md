talk2me
=======

A simple WebSocket chat client and server written in PHP and JavaScript with users and rooms support. By design no data is ever persisted on the client or server side. Chat sessions are not persistent.



INSTALL
=======
Run chat server.

    php bin/chat-server.php

Copy `www/cdn/js/example.config.js` to `www/cdn/js/config.js` and update the `webSocketUrl`.

Open `www/index.html` in a browser, login, and begin chatting.



TODO
====
* Don't allow duplicate usernames.
