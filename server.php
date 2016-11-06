<?php

$state_file_name = "v/" . $_GET["id"];

// Time-out clients who haven't connected in a while
$MAX_POLL_INTERVAL = 5.0;

// Slack to add before synchronised playback starts
$PLAY_START_SLACK = 1.0;

////////////////////////////////////////////////////////////////////////////////
// Load the state
////////////////////////////////////////////////////////////////////////////////

// Lock the file
$state_file = fopen($state_file_name, "r");
flock($state_file, LOCK_EX);

// Read back state
$server_state = json_decode(file_get_contents($state_file_name), true);


////////////////////////////////////////////////////////////////////////////////
// Update client state
////////////////////////////////////////////////////////////////////////////////

$client_id = $_POST['client_id'];

// Retrieve client's state
$new_client_state = json_decode($_POST["client_state"], true);

// Record that a message was receieved from the client
// XXX: Subtract 1ms to make sure it is in the past...
$new_client_state["last_contact"] = microtime(true) - 0.001;

// Update client state
$old_client_state = $server_state["clients"][$client_id];
$server_state["clients"][$client_id] = $new_client_state;

// Filter clients who haven't been in contact in a while
function is_client_fresh($client_state) {
	global $MAX_POLL_INTERVAL;
	$last_contact = microtime(true) - $client_state["last_contact"];
	return($last_contact < $MAX_POLL_INTERVAL);
}
$server_state["clients"] = array_filter($server_state["clients"], "is_client_fresh");


////////////////////////////////////////////////////////////////////////////////
// Update server/playback state
////////////////////////////////////////////////////////////////////////////////

// Add current time
$server_state["time"] = microtime(true);


// Update the state to cause the video to seek to the specified play time
function seekTo($time) {
	global $server_state;
	
	// Pause (playback is resumed by video_play_on_all_ready if required).
	$server_state["video_playing"] = false;
	
	// Set time to seek to
	$server_state["video_time"] = $time;
	
	// Indicate state change
	$server_state["state_change_time"] = $server_state["time"];
}


// Execute the arriving command
$command = json_decode($_POST["command"], true);
switch ($command["command"]) {
	case "pause":
		$server_state["video_play_on_all_ready"] = false;
		seekTo($command["time"]);
		break;
	
	case "seek":
		$server_state["video_play_on_all_ready"] = true;
		seekTo($command["time"]);
		break;
}

// Update play state should be set based on all clients having polled
// since the state changed 
$all_ready = true;
foreach ($server_state["clients"] as $client_state) {
	// Client should seen the latest state and should be ready
	if (!($client_state["state_change_time"] == $server_state["state_change_time"] &&
	      $client_state["ready"])) {
		$all_ready = false;
	}
}
if ($all_ready && $server_state["video_play_on_all_ready"]) {
	// Work out how long in the future the play command must be sent for clients
	// to play back in sync
	$max_delay = 0.0;
	foreach ($server_state["clients"] as $client_state) {
		$this_delay = $client_state["poll_interval"] + $client_state["round_trip_time"];
		$max_delay = max($max_delay, $this_delay);
	}
	
	// Start play back shortly in the future
	$server_state["video_playing"] = true;
	$server_state["state_change_time"] = $server_state["time"] + $max_delay + $PLAY_START_SLACK;
	
	// Clear the flag
	$server_state["video_play_on_all_ready"] = false;
}


////////////////////////////////////////////////////////////////////////////////
// Store the new state
////////////////////////////////////////////////////////////////////////////////

// Store the state to disk
file_put_contents($state_file_name, json_encode($server_state));

// Send state to client
echo(json_encode($server_state));

// Unlock the file again
flock($state_file, LOCK_UN);
fclose($state_file);

?>
