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


TODO
====
As this is an alpha release there is much refactoring and testing to do.

* Admin room for sending global messages.
* On connection lost message is sent to users. Need to make sure only the connected room is notified.
* Logout link.
* Different sounds for messages, login, logout, ...
* Fix auto-scroll on new messages. Will be annoying to scroll while reading previous messages. Auto-scroll only on your own messages. Received messages should not cause scroll. Fix message input to bottom of screen.
* Don't allow duplicate usernames.
* Ponder settings such as sounds only when name mentioned. Settings would only persist in cookies.
* Better room and username validation. Currently room and user names aren't very restrictive.
* Verify all communication is secure.
* Secure rooms
