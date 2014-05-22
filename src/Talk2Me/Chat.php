<?php
namespace Talk2Me;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

if (file_exists(__DIR__ . "/CommandPlugin.php")) { 
    require_once(__DIR__ . "/CommandPlugin.php");
}

class Chat implements MessageComponentInterface {

    protected $clients;
    private $rooms;
    private $roomUsers;
    private $users;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
        $this->users = array();
        foreach ($this->users as $k=>$v) {
            unset($this->users[$k]);
        }
        unset($this->rooms);
        unset($this->roomUsers);
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $json = json_decode($msg);

        if ($json->a === "login") {

            // Handle login
            $this->handleLogin($from, $json, $msg);

            return;

        } else if ($json->a === "message") {

            // Handle sending messages.
            $this->handleMessage($from, $json);

            return;

        } else if ($json->a === "who") {

            // Returns who is online
            $this->whoIsOnline($from);

            return;

        } else if ($json->a === "statusChange") {

            $this->setUserStatus($from, $json->status);
            $json->msg = "@" . $this->getUsername($from) . " went " . $json->status 
                    . " <span class=\"timestamp\">" . date("Y-m-d H:i:s") . "</span>";
            $this->handleMessage($from, $json, "status-message");

            return;

        } else if ($json->a === "typing") {

            $json->msg = "@" . $this->getUsername($from) . " is typing.";
            $this->handleMessage($from, $json, "typing");
            
        }
    }

    public function handleLogin($from, $json, $msg) {
        $isLoggedIn = $this->isLoggedIn($json->username);

        if ($isLoggedIn) {
            $response = array("status"=>"ok", "a"=>"login", "isLoggedIn"=>true);
            $from->send(json_encode($response));
            return;
        } else {
            $this->setUsers($from, $json->username);

            $response = array("status"=>"ok", "a"=>"login", "isLoggedIn"=>false);
            $from->send(json_encode($response));

            $this->setRoom($from, $json->room);
            $this->setUsername($from, $json->username);
            $this->setUserStatus($from, "Free");
            $this->roomUsers[$json->room][$json->username] = $json->username;

            $this->whoIsOnline($from);

            foreach ($this->clients as $client) {
                if ($from !== $client 
                        // Ensure message is sent to the proper room.
                        && $this->getRoom($from) === $this->getRoom($client)) {
                    $o = array("status"=>"ok", "a"=>"message", "t"=>"status", 
                            "msg"=>"<span style=\"color:green;\">@" 
                            . $json->username . " joined</span> <span class=\"timestamp\">" 
                            . date("Y-m-d H:i:s") . "</span>");
                    $client->send(json_encode($o));
                }
            }
        }
    }

    function handleMessage($from, $json, $t=null) {
        if (!isset($t)) {
            $t = "message";
        }

        if (class_exists("Talk2Me\CommandPlugin")) {
            $cp = new \Talk2Me\CommandPlugin;
            $executed = $cp->execute($this, $from, $json, $t);
            // If a command was executed it is assumed to have been sent back to $from.
            // We don't send commands to clients unless we do it in execute() explicity;
            if ($executed) {
                return;
            }
        }

        $fromUsername = $this->getUsername($from);
        foreach ($this->clients as $client) {
            // Don't send message to the sender.
            if ($from !== $client 
                    // Ensure message is sent to the proper room.
                    && $this->getRoom($from) === $this->getRoom($client)) {
                $o = array("status"=>"ok", "a"=>"message", "t"=>$t, 
                        "msg"=>$json->msg);
                if ($t === "typing") {
                    $o['from'] = $fromUsername;
                }
                $client->send(json_encode($o));
            }
        }
    }

    public function getRoomMembersMessage($from) {
        $room = $this->getRoom($from);
        $currentMembers = "";
        foreach ($this->roomUsers[$room] as $username) {
            $resourceId = array_search($username, $this->users);
            $status = $this->rooms[$resourceId]['status'];
            if ($status === "Free") {
                $currentMembers .= "@{$username}, ";
            } else {
                $currentMembers .= "@{$username}.<span class=\"user-status\">{$status}</span>, ";
            }
        }
        $currentMembers = rtrim($currentMembers, ", ");
        return "<strong style=\"color:green;\">Online</strong> {$currentMembers} <span class=\"timestamp\">" 
                . date("Y-m-d H:i:s") . "</span>";
    }

    public function whoIsOnline($from) {
        $msg = $this->getRoomMembersMessage($from);
        $currentMembersObj = array("status"=>"ok", "a"=>"message", "t"=>"status", "msg"=>$msg);
        $from->send(json_encode($currentMembersObj));
    }

    public function logout($client) {
        $room = $this->getRoom($client);
        $username = $this->getUsername($client);
        $this->removeFromUsers($username);
        $this->unsetRoomUserClient($client);
        $this->clients->detach($client);

        if (isset($room) && isset($username)) {
            foreach ($this->clients as $theClient) {
                $o = array("status"=>"ok", "a"=>"message", 
                        "msg"=>"<span style=\"color:red;\">@" 
                        . $username . " disconnected</span> <span class=\"timestamp\">" 
                        . date("Y-m-d H:i:s") . "</span>");
                if ($this->getRoom($theClient) === $room) {
                    $theClient->send(json_encode($o));
                }
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->logout($conn);
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->logout($conn);
        $conn->close();
    }

    public function getUserStatus($client) {
        return $this->rooms[$client->resourceId]['status'];
    }

    public function setUserStatus($client, $status) {
        $this->rooms[$client->resourceId]['status'] = $status;
    }

    public function getRoom($client) {
        return $this->rooms[$client->resourceId]['room'];
    }

    public function setRoom($client, $room) {
        $this->rooms[$client->resourceId]['room'] = $room;
    }

    public function getUsername($client) {
        return $this->rooms[$client->resourceId]['username'];
    }

    public function setUsername($client, $username) {
        $this->rooms[$client->resourceId]['username'] = $username;
    }

    public function unsetRoomUserClient($client) {
        $key = false;
        if (is_array($this->roomUsers[$this->getRoom($client)])) {
            $key = array_search($this->getUsername($client), 
                    $this->roomUsers[$this->getRoom($client)]);
        }
        if ($key) {
            unset($this->roomUsers[$this->rooms[$client->resourceId]['room']][$key]);
            unset($this->rooms[$client->resourceId]);
        }
    }

    public function setUsers($client, $username) {
        $this->users[$client->resourceId] = $username;
    }

    public function getUsers() {
        return $this->users;
    }

    public function removeFromUsers($username) {
        $key = array_search($username, $this->users);
        if ($key) {
            unset($this->users[$key]);
        }
    }

    public function isLoggedIn($username) {
        if (in_array($username, $this->users)) {
            return true;
        } else {
            return false;
        }
    }

}
