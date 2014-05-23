function random(min, max) {
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
    var d = new Date(); 
    return d.today() + " " + d.timeNow();
}

function sendMessage(msg) {
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

    msg = "<strong>@" + username + "</strong> " + msg 
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
    scrollToBottom();
}

function scrollToBottom() {
    $("html, body").animate({ scrollTop: $(document).height() - $(window).height() });
}

function removeErrorMessages() {
    var errMsg = $("#error");
    if (errMsg.size() > 0) {
        errMsg.each(function(i, r) {
            $(r).remove()
        });
    }
}

threshold = 2000;
lastTyping = parseInt(new Date().getTime()) - threshold;
function handleMessage(json) {
    if (isLoggedIn) {
        jsonObj = JSON.parse(json);
        if (jsonObj.a === "message" && jsonObj.t === "typing") {
            if ($(".from-" + jsonObj.from).size() < 1) {
                $.jGrowl(jsonObj.msg, { life: 3500, group: "from-" + jsonObj.from }); 
            }
        } else if (jsonObj.a === "message" && jsonObj.t === "status-message") {
            $.jGrowl(jsonObj.msg, { life: 1500, group: "from-status-" + jsonObj.from }); 
        } else if (jsonObj.a === "message" && jsonObj.t === "status") {
            appendMessage(jsonObj.msg);
            if (!windowFocused && jsonObj.t === "message") {
                Tinycon.setBubble(++messageCount);
            }
        } else if (jsonObj.a === "message" && jsonObj.t === "message") {
            // Remove Growls on message received.
            if ($(".from-" + jsonObj.from).size() > 0) {
                lastTyping = parseInt(new Date().getTime()) - threshold;
                $(".from-" + jsonObj.from).remove();
            }

            // Only play sounds for these types of messages.
            var notif = new Audio("cdn/sounds/notification.ogg");
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
                            console.log("is test > last: " + test + " > " + lastTyping);
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
    var request = {"a": "typing"};
    conn.send(JSON.stringify(request));
}

function appendMessage(msg) {
    $(".messages").append("<div class=\"well well-sm message\">" + msg + "</div>");
}

usekey = false;
secret = "";
function login() {
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
        } else {
            usekey = false;
            secret = "";
        }

        window.location.hash = room + "@" + username;

        startConnection(room, username);
    } else {
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
    $("#logout").on("click", function() {
        logout();
    });
}

function logout() {
    isLoggedIn = false;
    usekey = false;
    secret = "";
    var request = {"a": "logout"};
    conn.send(JSON.stringify(request));
    window.location.href = window.location.protocol + "//" 
            + window.location.hostname + window.location.pathname;
}

function applyChangeStatusEvent() {
    $(".chg-status").on("click", function() {
        var newStatus = $(this).text();
        sendChangeStatus(newStatus);
        $("#message").focus();
        scrollToBottom();
    });
}

function sendChangeStatus(newStatus) {
    $("#current-status").text(newStatus);
    var request = {"a": "statusChange", "status": newStatus};
    conn.send(JSON.stringify(request));
}


function getStatus() {
    return $("#current-status").text();
}

function applyWhoEvent() {
    $("#who").on("click", function() {
        who();
    });
}

function applyClearMessagesEvent() {
    $("#clear-messages").on("click", function() {
        clearMessages();
    });
}

function clearMessages() {
    var messages = $(".message");
    if (messages.size() > 0) {
        messages.each(function(i, r) {
            $(r).remove();
        });
        who();
    }
}

function who() {
    var request = {"a": "who"};
    conn.send(JSON.stringify(request));
    $("#message").focus();
    scrollToBottom();
}

function strip_tags(input, allowed) {
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
    try {
        var request = {"a": "login", "room": room, "username": username};
        conn.send(JSON.stringify(request));
    } catch (ex) {
    }
}

connected = false;
function startConnection(room, username) {
    if (!connected) {
        conn = new WebSocket(webSocketUrl);

        conn.onopen = function(e) {
            connected = true;
            reConnecting = false;
            loginToRoom(room, username);
        };

        conn.onclose = function(e) {
            isLoggedIn = false;
            connected = false;
            $("#message").remove();
            if (!reConnecting) {
                $("footer").html("<div id=\"login-form\"><!--add form on reconnect--></div>");
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
                $("footer").html("<div id=\"login-form\"><!--add form on reconnect--></div>");
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

reConnecting = false;
function reConnect() {
    reConnecting = true;
    if (!connected) {
        if ($("#room").size() < 1) {
            $("body").append("<input id=\"room\" type=\"hidden\" />");
        }
        if ($("#username").size() < 1) {
            $("body").append("<input id=\"username\" type=\"hidden\" />");
        }
        init();
        setTimeout("reConnect()", 2000);
    }
}

idle = false;
lastActive = moment().format("X");
function autoSetStatus() {
    var now = moment().format("X");
    var elapsed = now - lastActive;
    if (!idle && elapsed > idleInSeconds && getStatus() === "Free") {
        sendChangeStatus("Idle");
        idle = true;
    }
    setTimeout("autoSetStatus()", 5000);
}

function resetIdleStatus() {
    if (idle) {
        idle = false;
        lastActive = moment().format("X");
        sendChangeStatus("Free");
    }
}

function init() {
    autoSetStatus();
    var hash = window.location.hash;
    room = "";
    username = "";
    if (hash.match(/#/) && hash.match(/@/)) {
        room = hash.replace(/^#(.*)@(.*)$/, "$1");
        $("#room").val(room);
        username = hash.replace(/^#(.*)@(.*)$/, "$2");
        $("#username").val(username);
        login();
    }
}

function switchClass(thiz, from, to) {
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
    return String.fromCharCode.apply(null, new Uint16Array(buf));
}

/**
 * http://updates.html5rocks.com/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
 */
function str2ab(str) {
    var buf = new ArrayBuffer(str.length * 2);
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function encryptMessage(msg) {
    try {
        return ab2str(asmCrypto.AES_CBC.encrypt(msg, secret));
    } catch (ex) {
        console.log("Could not encrypt message.");
    }
}

function decryptMessage(msg) {
    try {
        return ab2str(asmCrypto.AES_CBC.decrypt(msg, secret));
    } catch (ex) {
        console.log("Could not decrypt message.");
    }
}

$(document).ready(function() {

    isLoggedIn = false;

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
        } else {
            $("#key-length").css("color", "red");
        }
        $("#key-length").html("Key length is " + l + " characters");
    });

    $(window).on("unload", function() {
        return confirm("Are you sure you want to logout?");
    });

    windowFocused = true;
    messageCount = 0;
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

    $(window).on("mousemove, scroll, resize, keypress", function() {
        if (idle) {
            resetIdleStatus();
        }
    });

});
