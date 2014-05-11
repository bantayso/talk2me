<?php
namespace Talk2Me;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class Chat implements MessageComponentInterface {

    protected $clients;
    private $rooms;
    private $roomUsers;

    public function __construct() {
        $this->clients = new \SplObjectStorage;
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $json = json_decode($msg);

        if ($json->a === "login") {

            // Handle login

            $this->setRoom($from, $json->room);
            $this->setUsername($from, $json->username);

            $this->roomUsers[$json->room][$json->username] = $json->username;

            $currentMembers = "";
            foreach ($this->roomUsers[$json->room] as $username) {
                $currentMembers .= "@{$username}, ";
            }
            $currentMembers = rtrim($currentMembers, ", ");
            $currentMembersObj = array("status"=>"ok", "a"=>"message", "t"=>"status",
                    "msg"=>"<strong style=\"color:green;\">Online</strong> {$currentMembers} <span class=\"timestamp\">" 
                    . date("Y-m-d H:i:s") . "</span>");
            $from->send(json_encode($currentMembersObj));

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

            return;

        } else if ($json->a === "message") {

            // Handle sending messages.

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

            return;

        }
    }

    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);

        $room = $this->getRoom($conn);
        $username = $this->getUsername($conn);

        $this->unsetRoomUserClient($conn);

        if (isset($room) && isset($username)) {
            foreach ($this->clients as $client) {
                $o = array("status"=>"ok", "a"=>"message", 
                        "msg"=>"<span style=\"color:red;\">@" 
                        . $username . " disconnected</span> <span class=\"timestamp\">" 
                        . date("Y-m-d H:i:s") . "</span>");
                if ($this->getRoom($client) === $room) {
                    $client->send(json_encode($o));
                }
            }
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
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
        $key = array_search($this->getUsername($client), 
                $this->roomUsers[$this->getRoom($client)]);
        if ($key) {
            unset($this->roomUsers[$this->rooms[$client->resourceId]['room']][$key]);
            unset($this->rooms[$client->resourceId]);
        }
    }

}
