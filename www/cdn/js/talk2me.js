;(function() {
    var isLoggedIn = false;
    var threshold = 2000;
    var lastTyping = parseInt(new Date().getTime()) - threshold;
    var usekey = false;
    var secret = "";
    var connected = false;
    var reConnecting = false;
    var idle = false;
    var lastActive = moment().format("X");
    var room = "";
    var username = "";
    var windowFocused = true;
    var messageCount = 0;
    var conn = null;

    function random(min, max) {
        "use strict";
        return Math.round(Math.random() * (max - min) + min);
    }

    Date.prototype.today = function () { 
        return (this.getFullYear()) + "-" 
                + (((this.getMonth()+1) < 10) ? "0" : "") + (this.getMonth()+1) + "-"
                + ((this.getDate() < 10) ? "0" : "") + this.getDate();
    }

    Date.prototype.timeNow = function () {
        return ((this.getHours() < 10)?"0":"") + this.getHours() 
                +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() 
                +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
    }

    String.prototype.trim = function() { 
        return this.replace(/^\s +|\s +$/g, ""); 
    } 

    String.prototype.ltrim = function() { 
        return this.replace(/^\s +/, ""); 
    } 

    String.prototype.rtrim = function() { 
        return this.replace(/\s +$/, ""); 
    }

    function getTimestamp() {
        "use strict";
        var d = new Date(); 
        return d.today() + " " + d.timeNow();
    }

    function sendMessage(msg) {
        "use strict";
        if (undefined === msg || msg.length < 1) {
            return;
        }
        if (msg.match(/^\s*(\/logout|\/exit|\/quit|\/q)\s*$/)) {
            logout();
            return;
        } else if (msg.match(/^\s*\/room\s*[0-9a-zA-Z_\-\.]{1,16}\s*$/)) {
            var room = msg.replace(/\/room\s*([0-9a-zA-Z_\-\.]{1,16})/, "$1");
            window.location.hash = "#" + room + "@" + username;
            location.reload();
            return;
        } else if (msg.match(/^\s*(\/clear|\/refresh)\s*$/)) {
            clearMessages();
            return;
        }

        msg = "<span class=\"room-user-message\">@" + username + "</span> " + msg 
                + " <span class=\"timestamp\">" + getTimestamp() + "</span>";
        // These are the allowed HTML tags in messages.
        msg = strip_tags(msg, "<strong><em><table><thead><tbody><tr><th><td>"
                + "<img><br><br/><a><p><div><ul><li><ol><span><hr><hr/><dd><dl><dt>");
        var orgMsg = msg;

        if (usekey) {
            msg = encryptMessage(msg);
        }

        var request = {"a": "message", "msg": msg};
        conn.send(JSON.stringify(request));
        appendMessage(orgMsg);
        scrollToTop();
    }

    function scrollToBottom() {
        "use strict";
        $("html, body").animate({ scrollTop: $(document).height() - $(window).height() });
    }

    function scrollToTop() {
        "use strict";
        $("html, body").animate({ scrollTop: 0 });
    }

    function removeErrorMessages() {
        "use strict";
        var errMsg = $("#error");
        if (errMsg.size() > 0) {
            errMsg.each(function(i, r) {
                $(r).remove()
            });
        }
    }

    function updateRoomMember(username, currentStatus) {
        "use strict";
        var usernameHtml = "";
        if (currentStatus === "Free") {
            usernameHtml = "@" + username;
        } else {
            usernameHtml = "@" + username + ".<span class=\"user-status\">" + currentStatus + "</span>";
        }
                    
        var user = $(".room-user[data-username='" + username + "']");
        if (user.size() > 0) {
            var userHtml = "<span class=\"room-user\" data-username=\"" + username + "\">" + usernameHtml + "</span>";
            // These two lines move the user to the front of the list as they are the most active.
            removeRoomMember(username);
            $("#users-online").prepend(userHtml);
        }
    }

    function addRoomMember(username) {
        "use strict";
        var user = $(".room-user[data-username='" + username + "']");
        if (user.size() < 1) {
            var userHtml = "<span class=\"room-user\" data-username=\"" + username + "\">@" + username + "</span>";
            // This line moves the user to the front of the list as she is the most active.
            $("#users-online").prepend(userHtml);
        }
    }

    function removeRoomMember(username) {
        "use strict";
        var user = $(".room-user[data-username='" + username + "']");
        if (user.size() > 0) {
            user.remove();
        }
    }

    function updateRoomMembers(users) {
        "use strict";
        for (var username in users) {
            var user = $(".room-user[data-username='" + username + "']");
            if (user.size() < 1) {
                $("#users-online").append("<span class=\"room-user\" data-username=\"" 
                        + username + "\">" + users[username] + "</span>");
            }
        }
    }

    function handleMessage(json) {
        "use strict";
        if (isLoggedIn) {
            var jsonObj = JSON.parse(json);
            if (jsonObj.a === "message" && jsonObj.t === "typing") {
                if ($(".from-" + jsonObj.from).size() < 1) {
                    $.jGrowl(jsonObj.msg, { life: 3500, group: "from-" + jsonObj.from }); 
                }
            } else if (jsonObj.a === "message" && jsonObj.t === "status-message") {
                // This is where we add, remove or update a person in room.
                if (jsonObj['statusType'] === "disconnect") {
                    removeRoomMember(jsonObj.username);
                } else if (jsonObj['statusType'] === "join") {
                    addRoomMember(jsonObj.username);
                } else if (jsonObj['statusType'] === "statusChange") {
                    updateRoomMember(jsonObj.username, jsonObj['currentStatus']);
                }

                $.jGrowl(jsonObj.msg, { life: 1500, group: "from-status-" + jsonObj.from }); 
            } else if (jsonObj.a === "message" && jsonObj.t === "who") {
                updateRoomMembers(jsonObj.users);
            } else if (jsonObj.a === "message" && jsonObj.t === "message") {
                // Remove Growls on message received.
                if ($(".from-" + jsonObj.from).size() > 0) {
                    lastTyping = parseInt(new Date().getTime()) - threshold;
                    $(".from-" + jsonObj.from).remove();
                }

                // Only play sounds for these types of messages.
                var notif = new Audio("cdn/sounds/" + notifMessage);
                notif.volume = 0.5;
                notif.play();

                // Decrypt messages if using a key.
                if (usekey) {
                    jsonObj.msg = decryptMessage(jsonObj.msg);
                }

                appendMessage(jsonObj.msg);
                if (!windowFocused && jsonObj.t === "message") {
                    Tinycon.setBubble(++messageCount);
                }
            } else if (jsonObj.a === "login") {
                if (jsonObj.isLoggedIn) {
                    removeErrorMessages();
                    $("#login-form").prepend("<div id=\"error\"></div>");
                    $("#error").addClass("alert alert-warning fade in")
                            .append("<button id=\"close\">&times;</button>");
                    $("#close").addClass("close").attr({"type":"button", "data-dismiss":"alert"})
                            .after("Username already taken");
                } else {
                    var source = $("#message-form").html();
                    var template = Handlebars.compile(source);
                    var context = {room: room, username: username}
                    var html = template(context);
                    $("#login-form").replaceWith(html);
                    $("#message").focus();
                    $("#message").keypress(function (e) {
                        if (e.which == 13) {
                            e.preventDefault();
                            sendMessage($("#message").val());
                            $("#message").val('');
                            $("#message").focus();
                            return false;
                        } else {
                            // This will only send a typing message at most every 'threshold' seconds.
                            var curTyping = parseInt(new Date() . getTime());
                            var test = curTyping - threshold;
                            if (curTyping - threshold > lastTyping) {
                                sendTyping();
                                lastTyping = curTyping;
                            }
                        }
                    });
                    applyLogoutEvent();
                    applyWhoEvent();
                    applyClearMessagesEvent();
                    applyChangeStatusEvent();
                    $(".btn-tooltip").tooltip();
                }
            }
        }
    }

    function sendTyping() {
        "use strict";
        var request = {"a": "typing"};
        conn.send(JSON.stringify(request));
    }

    function appendMessage(msg) {
        "use strict";
        $(".messages").prepend("<div class=\"well well-sm message\">" + Wwiki.render(msg) + "</div>");
    }

    function login() {
        "use strict";
        room = $("#room").val().trim();
        username = $("#username").val().trim();
        if (undefined !== username && username.match(/^[0-9a-zA-Z_\-\.]{1,16}$/)) {
            isLoggedIn = true;

            if (undefined !== room && room.length > 1) {
                if (!room.match(/^[0-9a-zA-Z_\-\.]{1,16}$/)) {
                    removeErrorMessages();
                    $("#login-form").prepend("<div id=\"error\"></div>");
                    $("#error").addClass("alert alert-warning fade in")
                            .append("<button id=\"close\">&times;</button>");
                    $("#close").addClass("close").attr({"type":"button", "data-dismiss":"alert"})
                            .after("Rooms must be 1-16 of these characters: 0-9a-zA-Z_-.");
                    return false;
    }
            } else {
                room = "public";
            }

            if ($("#usekey").is(":checked")) {
                usekey = true;
                secret = $("#secret").val();
                var l = secret.length;
                if (l !== 32) {
                    removeErrorMessages();
                    $("#login-form").prepend("<div id=\"error\"></div>");
                    $("#error").addClass("alert alert-warning fade in")
                            .append("<button id=\"close\">&times;</button>");
                    $("#close").addClass("close").attr({"type":"button", "data-dismiss":"alert"})
                            .after("Secret key for client-side encryption must be 32 characters.");
                    return false;
                }
            } else {
                usekey = false;
                secret = "";
            }

            window.location.hash = room + "@" + username;

            $(".header").hide();

            startConnection(room, username);
        } else {
            $(".header").show();
            removeErrorMessages();
            $("#login-form").prepend("<div id=\"error\"></div>");
            $("#error").addClass("alert alert-warning fade in")
                    .append("<button id=\"close\">&times;</button>");
            $("#close").addClass("close").attr({"type":"button", "data-dismiss":"alert"})
                    .after("Usernames must be 1-16 of these characters: 0-9a-zA-Z_-.");
            return false;
        }
    }

    function applyLogoutEvent() {
        "use strict";
        $("#logout").on("click", function() {
            logout();
        });
    }

    function logout() {
        "use strict";
        isLoggedIn = false;
        usekey = false;
        secret = "";
        var request = {"a": "logout"};
        conn.send(JSON.stringify(request));
        window.location.href = window.location.protocol + "//" 
                + window.location.hostname + window.location.pathname;
    }

    function applyChangeStatusEvent() {
        "use strict";
        $(".chg-status").on("click", function() {
            var newStatus = $(this).text();
            sendChangeStatus(newStatus);
            $("#message").focus();
            scrollToTop();
        });
    }

    function sendChangeStatus(newStatus) {
        "use strict";
        updateRoomMember(username, newStatus);
        $("#current-status").text(newStatus);
        var request = {"a": "statusChange", "status": newStatus};
        conn.send(JSON.stringify(request));
    }


    function getStatus() {
        "use strict";
        return $("#current-status").text();
    }

    function applyWhoEvent() {
        "use strict";
        $("#who").on("click", function() {
            who();
        });
    }

    function applyClearMessagesEvent() {
        "use strict";
        $("#clear-messages").on("click", function() {
            clearMessages();
        });
    }

    function clearMessages() {
        "use strict";
        var messages = $(".message");
        if (messages.size() > 0) {
            messages.each(function(i, r) {
                $(r).remove();
            });
            who();
        }
    }

    function who() {
        "use strict";
        var request = {"a": "who"};
        conn.send(JSON.stringify(request));
        $("#message").focus();
        scrollToTop();
    }

    function strip_tags(input, allowed) {
        "use strict";
        //  discuss at: http://phpjs.org/functions/strip_tags/
        allowed = (((allowed || '') + '').toLowerCase()
                .match(/<[a-z][a-z0-9]*>/g) || []).join('');
        var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
            commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
        return input.replace(commentsAndPhpTags, '').replace(tags, function ($0, $1) {
            return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
    }

    function loginToRoom(room, username) {
        "use strict";
        try {
            var request = {"a": "login", "room": room, "username": username};
            conn.send(JSON.stringify(request));
        } catch (ex) {
        }
    }

    function startConnection(room, username) {
        "use strict";
        if (!connected) {
            conn = new WebSocket(webSocketUrl);

            conn.onopen = function(e) {
                if (reConnecting) {
                    clearMessages();
                }
                connected = true;
                reConnecting = false;
                loginToRoom(room, username);
            };

            conn.onclose = function(e) {
                isLoggedIn = false;
                connected = false;
                $("#message").remove();
                if (!reConnecting) {
                    $(".main-control").html("<div id=\"login-form\"><!--add form on reconnect--></div>");
                    var source = $("#connection-lost-msg").html();
                    var template = Handlebars.compile(source);
                    var context = {timestamp: getTimestamp()};
                    var html = template(context);
                    appendMessage(html);
                    reConnect();
                }
            };

            conn.onerror = function(e) {
                isLoggedIn = false;
                connected = false;
                $("#message").remove();
                if (!reConnecting) {
                    $(".main-control").html("<div id=\"login-form\"><!--add form on reconnect--></div>");
                    var source = $("#connection-lost-msg").html();
                    var template = Handlebars.compile(source);
                    var context = {timestamp: getTimestamp()};
                    var html = template(context);
                    appendMessage(html);
                    reConnect();
                }
            };

            conn.onmessage = function(e) {
                if (isLoggedIn) {
                    handleMessage(e.data);
                }
            };
        } else {
            loginToRoom(room, username);
        }
    }

    function reConnect() {
        "use strict";
        reConnecting = true;
        if (!connected) {
            if ($("#room").size() < 1) {
                $("body").append("<input id=\"room\" type=\"hidden\" />");
            }
            if ($("#username").size() < 1) {
                $("body").append("<input id=\"username\" type=\"hidden\" />");
            }
            init();
            setTimeout(reConnect, 2000);
        }
    }

    function autoSetStatus() {
        "use strict";
        var now = moment().format("X");
        var elapsed = now - lastActive;
        if (!idle && elapsed > idleInSeconds && getStatus() === "Free") {
            sendChangeStatus("Idle");
            idle = true;
        }
        setTimeout(autoSetStatus, 5000);
    }

    function resetIdleStatus() {
        "use strict";
        if (idle) {
            idle = false;
            lastActive = moment().format("X");
            sendChangeStatus("Free");
        }
    }

    function init() {
        "use strict";
        autoSetStatus();
        room = "";
        username = "";
        var hash = window.location.hash;
        if (hash.match(/#/) && hash.match(/@/)) {
            room = hash.replace(/^#(.*)@(.*)$/, "$1");
            $("#room").val(room);
            username = hash.replace(/^#(.*)@(.*)$/, "$2");
            $("#username").val(username);
            login();
        }
    }

    function switchClass(thiz, from, to) {
        "use strict";
        if (thiz.size() > 0) {
            if (thiz.hasClass(from)) {
                thiz.removeClass(from);
            }
            if (!thiz.hasClass(to)) {
                thiz.addClass(to);
            }
        }
    }

    /**
    * http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
    */
    function ab2str(buf) {
        "use strict";
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }

    /**
    * http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
    */
    function str2ab(str) {
        "use strict";
        var buf = new ArrayBuffer(str.length * 2);
        var bufView = new Uint16Array(buf);
        for (var i=0, strLen=str.length; i<strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    function encryptMessage(msg) {
        "use strict";
        try {
            return ab2str(asmCrypto.AES_CBC.encrypt(msg, secret));
        } catch (ex) {
            console.log("Could not encrypt message.");
        }
    }

    function decryptMessage(msg) {
        "use strict";
        try {
            return ab2str(asmCrypto.AES_CBC.decrypt(msg, secret));
        } catch (ex) {
            console.log("Could not decrypt message.");
        }
    }

    $(document).ready(function() {

        init();

        $(".btn-tooltip").tooltip();

        $("#room").focus();

        $("#room, #username").keypress(function (e) {
            if (e.which == 13) {
                e.preventDefault();
                login();
                return false;
            }
        });

        $("#login-button").on("click", function() {
            login();
            return false;
        });

        applyLogoutEvent();

        $("#usekey").on("click", function() {
            if ($("#usekey").is(":checked")) {
                switchClass($("#keyform"), "block-hidden", "block-visible");
                $("#secret").focus();
            } else {
                switchClass($("#keyform"), "block-visible", "block-hidden");
            }
        });

        $("#secret").on("keyup", function() {
            var l = $("#secret").val().length;
            if (l === 32) {
                $("#key-length").css("color", "green");
                $("#key-length").html("Valid key");
            } else {
                $("#key-length").css("color", "red");
                $("#key-length").html(l + " characters of 32");
            }
        });

        $(window).on("unload", function() {
            return confirm("Are you sure you want to logout?");
        });

        $(window).focus(function() {
            windowFocused = true;
            messageCount = 0;
            Tinycon.setBubble(messageCount);
            if (idle) {
                resetIdleStatus();
            }
        }).blur(function() {
            windowFocused = false;
        });

        $(window).on("mouseenter, mousemove, mouseover, scroll, resize, keypress, click", function() {
            if (idle) {
                resetIdleStatus();
            }
        });

    });
})();
