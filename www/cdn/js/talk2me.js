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
    var jsonMsg = "{\"a\": \"message\", \"msg\": \"" + msg.replace(/"/g, "\\\"") + "\"}";
    conn.send(jsonMsg);
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
        }
    }
}

function appendMessage(msg) {
    $(".messages").append("<div class=\"well well-sm\">" + msg + "</div>");
    $("html, body").animate({ scrollTop: $(document).height() }, 1000);
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

        $form = "<form role=\"form\"><input name=\"message\" id=\"message\" "
                + "type=\"text\" class=\"form-control\" "
                + "placeholder=\"@" + username + " #" + room + " [enter]\" /></form>";
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
    } else {
        alert("Please enter a username between 3-8 characters!");
        return false;
    }
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

function startConnection(room, username) {
    conn = new WebSocket(webSocketUrl);

    conn.onopen = function(e) {
        conn.send("{\"a\": \"login\", \"room\":\"" + room + "\", \"username\": \"" + username + "\"}");
    };

    conn.onclose = function(e) {
    };

    conn.onmessage = function(e) {
        if (isLoggedIn) {
            handleMessage(e.data);
        }
    };
}

function init() {
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

    $("#room").focus();

    $("#room, #username").keypress(function (e) {
        if (e.which == 13) {
            e.preventDefault();
            login();
            return false;
        }
    });

    $(window).on("unload", function() {
        return confirm("Are you sure you want to logout?");
    });
});
