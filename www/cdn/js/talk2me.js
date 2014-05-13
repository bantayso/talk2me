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

function getTimestamp() {
    var d = new Date(); 
    return d.today() + " " + d.timeNow();
}

function sendMessage(msg) {
    if (undefined === msg || msg.length < 1) {
        return;
    }
    msg = "<strong>@" + username + "</strong> " + msg 
            + " <span class=\"timestamp\">" + getTimestamp() + "</span>";
    // These are the allowed HTML tags in messages.
    msg = strip_tags(msg, "<strong><em><table><thead><tbody><tr><th><td>"
            + "<img><br><br/><a><p><div><ul><li><ol><span><hr><hr/><dd><dl><dt>");
    var request = {"a": "message", "msg": msg};
    conn.send(JSON.stringify(request));
    appendMessage(msg);
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

function handleMessage(json) {
    if (isLoggedIn) {
        jsonObj = JSON.parse(json);
        if (jsonObj.a === "message") {
            var notif = new Audio("cdn/sounds/notification.ogg");
            notif.play();
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
                // Let's not show this form stuff until we get a response back.
                $form = "<form role=\"form\"><input name=\"message\" id=\"message\" "
                        + "type=\"text\" class=\"form-control\" "
                        + "placeholder=\"@" + username + " #" + room + " [enter]\" /></form>";
                // Status button
                $form += "<div class=\"btn-group btn-status\"><button "
                        + "type=\"button\" class=\"btn btn-default btn-sm dropdown-toggle\" "
                        + "data-toggle=\"dropdown\"><span id=\"current-status\">Free</span> "
                        + "<span class=\"caret\"></span></button><ul class=\"dropdown-menu\" "
                        + "role=\"menu\">"
                        + "<li><a class=\"cursor chg-status\">Free</a></li>"
                        + "<li><a class=\"cursor chg-status\">BRB</a></li>"
                        + "<li><a class=\"cursor chg-status\">Away</a></li>"
                        + "<li><a class=\"cursor chg-status\">Busy</a></li>"
                        + "<li><a class=\"cursor chg-status\">DND!</a></li>"
                        + "</ul></div>";
                // Who is online button
                $form += "<button class=\"logout btn btn-primary btn-sm btn-tooltip\" "
                        + "title=\"Who is online?\" id=\"who\">"
                        + "<span class=\"glyphicon glyphicon-user\"></span></button>";
                // Logout of room button
                $form += "<button class=\"logout btn btn-danger btn-sm btn-tooltip\" "
                        + "id=\"logout\" title=\"Logout of room\">"
                        + "<span class=\"glyphicon glyphicon-log-out\"></span></button>";
                $("#login-form").replaceWith($form);
                $("#message").focus();
                $("#message").keypress(function (e) {
                    if (e.which == 13) {
                        e.preventDefault();
                        sendMessage($("#message").val());
                        $("#message").val('');
                        $("#message").focus();
                        return false;
                    }
                });
                applyLogoutEvent();
                applyWhoEvent();
                applyChangeStatusEvent();
                $(".btn-tooltip").tooltip();
            }
        }
    }
}

function appendMessage(msg) {
    $(".messages").append("<div class=\"well well-sm\">" + msg + "</div>");
}

function login() {
    console.log("reConnect: running login()");
    room = $("#room").val();
    username = $("#username").val();
    if (undefined !== username && username.length > 2 && username.length < 9) {
        console.log("reConnect: username was good.");
        isLoggedIn = true;

        if (undefined !== room && room.length > 1) {
        } else {
            room = "public";
        }

        window.location.hash = room + "@" + username;

        startConnection(room, username);
    } else {
        removeErrorMessages();
        $("#login-form").prepend("<div id=\"error\"></div>");
        $("#error").addClass("alert alert-warning fade in")
                .append("<button id=\"close\">&times;</button>");
        $("#close").addClass("close").attr({"type":"button", "data-dismiss":"alert"})
                .after("Please enter a username between 3-8 characters!");;
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
    console.log("Sending status change: " + newStatus);
    conn.send(JSON.stringify(request));
}

function applyWhoEvent() {
    $("#who").on("click", function() {
        who();
    });
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
    console.log("reConnect: loginToRoom() running");
    try {
        var request = {"a": "login", "room": room, "username": username};
        conn.send(JSON.stringify(request));
    } catch (ex) {
        console.log("Could not reConnect to room: " + ex);
    }
}

connected = false;
function startConnection(room, username) {
    if (!connected) {
        console.log("reConnect: startConnection() not connected");
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
                appendMessage("<span class=\"connection-lost\"><strong style=\"color:red;\">Connection lost.</strong> "
                        + "<strong>Refresh to reconnect.</strong> If this persists please "
                        + "contact your system administrator.</span>");
                reConnect();
            }
        };

        conn.onmessage = function(e) {
            if (isLoggedIn) {
                handleMessage(e.data);
            }
        };
    } else {
        console.log("reConnect: run loginToRoom(" + room + ", " + username + ")");
        loginToRoom(room, username);
    }
}

reConnecting = false;
function reConnect() {
    reConnecting = true;
    if (!connected) {
        console.log("reConnect: connected - run init()");
        if ($("#room").size() < 1) {
            $("body").append("<input id=\"room\" type=\"hidden\" />");
        }
        if ($("#username").size() < 1) {
            $("body").append("<input id=\"username\" type=\"hidden\" />");
        }
        init();
        console.log("reConnect: not connected, run reConnect() again");
        setTimeout("reConnect()", 2000);
    }
}

idle = false;
lastActive = Math.round((new Date()).getTime() / 1000);
function autoSetStatus() {
    var now = Math.round((new Date()).getTime() / 1000);
    var elapsed = now - lastActive;
    if (!idle && elapsed > 15) {
        console.log("You've been idle for > 15 seconds. " + elapsed + " to be exact.");
        sendChangeStatus("Idle");
        idle = true;
    }
    setTimeout("autoSetStatus()", 5000);
}

function resetIdleStatus() {
    if (idle) {
        idle = false;
        lastActive = Math.round((new Date()).getTime() / 1000);
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

$(document).ready(function() {

    isLoggedIn = false;

    init();

    $("#room").focus();

    $("#room, #username").keypress(function (e) {
        if (e.which == 13) {
            e.preventDefault();
            login();
            return false;
        }
    });

    applyLogoutEvent();

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

    $(window).on("mousemove, scroll, resize", function() {
        if (idle) {
            resetIdleStatus();
        }
    });

});
