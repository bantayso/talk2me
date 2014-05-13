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
    msg = strip_tags(msg, "<strong><em><table><thead><tbody><tr><th><td>"
            + "<img><br><br/><a><p><div><ul><li><ol><span><hr><hr/><dd><dl><dt>");
    var request = {"a": "message", "msg": msg};
    conn.send(JSON.stringify(request));
    appendMessage(msg);
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
                alert("That username has already been taken.");
            } else {
                // Let's not show this form stuff until we get a response back.
                $form = "<form role=\"form\"><input name=\"message\" id=\"message\" "
                        + "type=\"text\" class=\"form-control\" "
                        + "placeholder=\"@" + username + " #" + room + " [enter]\" /></form>";
                $form += "<button class=\"logout btn btn-primary btn-sm btn-tooltip\" "
                        + "title=\"Who is online?\" id=\"who\">"
                        + "<span class=\"glyphicon glyphicon-user\"></span></button>";
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
            }
        }
    }
}

function appendMessage(msg) {
    $(".messages").append("<div class=\"well well-sm\">" + msg + "</div>");
}

function login() {
    room = $("#room").val();
    username = $("#username").val();
    if (undefined !== username && username.length > 2 && username.length < 9) {
        isLoggedIn = true;

        if (undefined !== room && room.length > 1) {
        } else {
            room = "public";
        }

        window.location.hash = room + "@" + username;

        startConnection(room, username);
    } else {
        alert("Please enter a username between 3-8 characters!");
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

function applyWhoEvent() {
    $("#who").on("click", function() {
        who();
    });
}

function who() {
    var request = {"a": "who"};
    conn.send(JSON.stringify(request));
    $("#message").focus();
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

connected = false;
function startConnection(room, username) {
    conn = new WebSocket(webSocketUrl);

    conn.onopen = function(e) {
        connected = true;
        var request = {"a": "login", "room": room, "username": username};
        conn.send(JSON.stringify(request));
    };

    conn.onclose = function(e) {
        isLoggedIn = false;
        connected = false;
        $("#message").remove();
        $("footer").html("<div id=\"login-form\"><!--add form on reconnect--></div>");
        appendMessage("<strong style=\"color:red;\">Connection lost.</strong> "
                + "<strong>Refresh to reconnect.</strong> If this persists please "
                + "contact your system administrator.");
        if (!connected) {
            reConnect();
        }
    };

    conn.onmessage = function(e) {
        if (isLoggedIn) {
            handleMessage(e.data);
        }
    };
}

function reConnect() {
    console.log("reConnectA: connected: " + connected);
    conn = new WebSocket(webSocketUrl);
    conn.onopen = function(e) { connected = true; };
    console.log("reConnectB: connected: " + connected);
    if (connected) {
        if ($("#room").size() < 1) {
            $("body").append("<input id=\"room\" type=\"hidden\" />");
        }
        if ($("#username").size() < 1) {
            $("body").append("<input id=\"username\" type=\"hidden\" />");
        }
        init();
    } else {
        setTimeout("reConnect()", 2000);
    }
}

function init() {
    console.log("init started");
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

windowFocused = true;
messageCount = 0;
$(window).focus(function() {
    windowFocused = true;
    messageCount = 0;
    Tinycon.setBubble(messageCount);
}).blur(function() {
    windowFocused = false;
});

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

    applyLogoutEvent();

    $(window).on("unload", function() {
        return confirm("Are you sure you want to logout?");
    });
});
