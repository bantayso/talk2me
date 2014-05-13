<?php
namespace Talk2Me;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

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
            $this->handleMessage($from, $json, $msg);

            return;

        } else if ($json->a === "who") {

            // Returns who is online
            $this->whoIsOnline($from);

            return;

        }
    }

    public function handleLogin($from, $json, $msg) {
        $isLoggedIn = $this->isLoggedIn($json->username);

        if ($isLoggedIn) {
            $response = array("status"=>"ok", "a"=>"login", "isLoggedIn"=>true);
            $from->send(json_encode($response));
            return;
        } else {
            $this->setUsers($json->username);

            $response = array("status"=>"ok", "a"=>"login", "isLoggedIn"=>false);
            $from->send(json_encode($response));

            $this->setRoom($from, $json->room);
            $this->setUsername($from, $json->username);

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

    function handleMessage($from, $json, $msg) {
        foreach ($this->clients as $client) {
            // Don't send message to the sender.
            if ($from !== $client 
                    // Ensure message is sent to the proper room.
                    && $this->getRoom($from) === $this->getRoom($client)) {
                $o = array("status"=>"ok", "a"=>"message", "t"=>"message", 
                        "msg"=>$json->msg);
                $client->send(json_encode($o));
            }
        }
    }

    public function whoIsOnline($from) {
        $room = $this->getRoom($from);
        $currentMembers = "";
        foreach ($this->roomUsers[$room] as $username) {
            $currentMembers .= "@{$username}, ";
        }
        $currentMembers = rtrim($currentMembers, ", ");
        $currentMembersObj = array("status"=>"ok", "a"=>"message", "t"=>"status",
                "msg"=>"<strong style=\"color:green;\">Online</strong> {$currentMembers} <span class=\"timestamp\">" 
                . date("Y-m-d H:i:s") . "</span>");
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

    public function setUsers($username) {
        $this->users[] = $username;
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
