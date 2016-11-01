<?php
	$MINIMUM_ID_LENGTH = 5;
	
	function rand_alphanumeric() {
		$n = rand(0, 26 + 26 + 10 - 1);
		if ($n < 26) { // Upper case
			return(chr($n + 65));
		} elseif ($n < 26 + 26) { // Lower case
			$n -= 26;
			return(chr($n + 97));
		} else { // Number
			$n -= 26 + 26;
			return(chr($n + 48));
		}
	}
	
	function rand_string($length) {
		$out = "";
		for ($i = 0; $i < $length; $i++) {
			$out .= rand_alphanumeric();
		}
		return($out);
	}
	
	$video_url = $_POST["videoURL"];
	
	// Generate a unique ID for the video
	$length = $MINIMUM_ID_LENGTH;
	do {
		$unique_id = rand_string($length); // TODO
		$state_file_name = "v/$unique_id";
		$length++;
	} while (file_exists($state_file_name));
	
	// Generate the initial state file
	file_put_contents($state_file_name, json_encode(array(
		// URL of video to play
		"video_url" => $video_url,
		
		// Should playback be triggered when all clients are ready?
		"video_play_on_all_ready" => false,
		
		// Should the video be playing right now?
		"video_playing" => false,
		
		// What time should the video be seeked to at state_change_time?
		"video_time" => 0.0,
		
		// What time did the state last change
		"state_change_time" => 0.0,
		
		// Client states (array from client ID to state)
		"clients" => array(),
	)));
	
	// Re-direct to the video player
	header("Location: /$state_file_name");
?>
