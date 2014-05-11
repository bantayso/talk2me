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
        // Store the new connection to send messages to later
        $this->clients->attach($conn);

        //echo "New connection! ({$conn->resourceId})\n";
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $numRecv = count($this->clients) - 1;
        //echo sprintf('Connection %d sending message "%s" to %d other connection%s' . "\n"
        //    , $from->resourceId, $msg, $numRecv, $numRecv == 1 ? '' : 's');

        $json = json_decode($msg);

        // Handle login
        if ($json->a == "login") {
            $this->rooms[$from->resourceId] = array("room"=>$json->room, "username"=>$json->username);
            $this->roomUsers[$json->room][$json->username] = $json->username;

            $currentMembers = "";
            foreach ($this->roomUsers[$json->room] as $username) {
                $currentMembers .= "@{$username}, ";
            }
            $currentMembers = rtrim($currentMembers, ", ");
            $currentMembersObj = array("status"=>"ok", "a"=>"message", 
                    "msg"=>"<strong style=\"color:green;\">Online</strong> {$currentMembers} <span class=\"timestamp\">" 
                    . date("Y-m-d H:i:s") . "</span>");
            $from->send(json_encode($currentMembersObj));

            foreach ($this->clients as $client) {
                if ($from !== $client 
                        // Ensure message is sent to the proper room.
                        && $this->rooms[$from->resourceId]['room'] == $this->rooms[$client->resourceId]['room']) {
                    $o = array("status"=>"ok", "a"=>"message", "msg"=>"<span style=\"color:green;\">@" 
                            . $json->username . " joined</span> <span class=\"timestamp\">" 
                            . date("Y-m-d H:i:s") . "</span>");
                    $client->send(json_encode($o));
                }
            }
            return;
        }

        if ($json->a == "message") {
            foreach ($this->clients as $client) {
                if ($from !== $client 
                        // Ensure message is sent to the proper room.
                        && $this->rooms[$from->resourceId]['room'] == $this->rooms[$client->resourceId]['room']) {
                    // The sender is not the receiver, send to each client connected
                    $o = array("status"=>"ok", "a"=>"message", "msg"=>$json->msg);
                    $client->send(json_encode($o));
                }
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        // The connection is closed, remove it, as we can no longer send it messages
        $this->clients->detach($conn);

        //echo "Connection {$conn->resourceId} has disconnected\n";
        foreach ($this->clients as $client) {
            $o = array("status"=>"ok", "a"=>"message", 
                    "msg"=>"<span style=\"color:red;\">@" 
                    . $this->rooms[$conn->resourceId]['username'] 
                    . " disconnected</span> <span class=\"timestamp\">" 
                    . date("Y-m-d H:i:s") . "</span>");
            $key = array_search($this->rooms[$conn->resourceId]['username'], 
                    $this->roomUsers[$this->rooms[$conn->resourceId]['room']]);
            if ($key) {
                unset($this->roomUsers[$this->rooms[$conn->resourceId]['room']][$key]);
            }
            unset($this->rooms[$conn->resourceId]);
            $client->send(json_encode($o));
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        //echo "An error has occurred: {$e->getMessage()}\n";

        $conn->close();
    }
}
