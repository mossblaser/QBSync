/**
 * Play synchronisation logic. Does not actually play video.
 */

// Interval between sending pings to the server (seconds)
const POLL_INTERVAL = 0.5;


function countObjectChildren(obj) {
	let count = 0;
	for (let child in obj) {
		count ++;
	}
	return count;
}


/**
 * Video synchronisation controller. Produces playback events which a video
 * player should deal with and accepts video playback control commands.
 *
 * Functions to call when video player state changes
 * - play(time): Call to start playback
 * - pause(time): Call to pause playback
 * - seek(time): Call to seek to a certain position
 * - busy(time): Call when the video player is busy.
 * - ready(): Call when the video player is ready to play.
 * - setVideoURL(url): Call to change the video being watched.
 *
 * Events:
 * - onPlay(): Fired when video playback should be started
 * - onPause(): Fired when video playback should be paused
 * - onPlaying(): Fired when video playback logically starts playing (i.e. when
 *   the 'paused' button should be shown etc.)
 * - onPaused(): Fired when video playback logically stops playing (i.e. when
 *   the 'play' button should be shown etc.)
 * - onSeek(time): Fired when play head should be moved
 * - onBusy(): Fired when playback is blocked by waiting for something.
 * - onReady(): Fired when playback may proceed normally.
 * - onViewersChanged(number): Fired when number of viewers changes.
 * - onVideoURLChanged(url): Fired when the video URL changes.
 * - onFatalError(error): Called on a fatal error.
 */
class VideoSynchroniser {
	constructor(serverURL) {
		this._serverURL = serverURL;
		
		// Pick a (hopefully...) unique ID for this client
		this._clientId = "" + Math.random();
		
		// The state of this client, as reported to the server
		this._clientState = {
			// Is the video buffered and ready to play?
			ready: false,
			
			// What was the last measured round-trip time to the server
			round_trip_time: 100,
			
			// How frequently will this client try to poll the server?
			poll_interval: POLL_INTERVAL,
			
			// The most recent timestamp received from the server (used to allow the
			// server to determine if the client has seen its most recent state
			// changes).
			state_change_time: -1,
		};
		
		// The most recently receieved server-side state from the server.
		this._serverState = {};
		
		// The handle of the interval responsible for polling the server
		this._pollIntervalId = null;
		
		// The handle of the timeout responsible for starting/stopping video
		// playback at a future time.
		this._playPauseTimeoutId = null;
	}
	
	/**
	 * Start polling the server. Should be called once when instantiated to begin
	 * synchronisation.
	 */
	start() {
		this._pollIntervalId = window.setInterval(
			() => this._pollServer(), POLL_INTERVAL*1000);
	}
	
	/**
	 * Stop polling the server. Should be called once before discarding this
	 * object.
	 */
	 stop() {
		if (this._pollIntervalId !== null) {
			window.clearInterval(this._pollIntervalId);
			this._pollIntervalId = null;
		}
		
		if (this._playPauseTimeoutId !== null) {
			window.clearInterval(this._playPauseTimeoutId);
			this._playPauseTimeoutId = null;
		}
	 }
	 
	 
	/**
	 * Poll the server, optionally including a specified command to execute. THe
	 * command is an object {command: "name", ...} defining the command to run
	 * and any arguments to include.
	 */
	_pollServer(command={}) {
		// Pack up command and other arguments
		const post = new FormData();
		post.append("client_id", this._clientId);
		post.append("client_state", JSON.stringify(this._clientState));
		post.append("command", JSON.stringify(command));
		
		// Send the request to the server
		const http = new XMLHttpRequest();
		http.open("POST", this._serverURL, true);
		http.send(post);
		
		// Handle the response
		var sendTime = Date.now()/1000.0;
		http.onreadystatechange = (event) => {
			if (http.readyState === XMLHttpRequest.DONE) {
				// Compute round-trip time
				var roundTrip = (Date.now()/1000.0) - sendTime;
				
				// Unpack the JSON response
				let data;
				try {
					data = JSON.parse(http.response);
				} catch(err) {
					console.log("XMLHttpRequest response not JSON:");
					console.log(err);
					console.log(http.response);
				}
				
				// Callback...
				this._handleServerMessage(data, roundTrip);
			}
		};
	}
	
	/**
	 * Callback called whenever a response is receieved from the server to a
	 * polling command.
	 */
	_handleServerMessage(data, roundTrip) {
		// Immediately stop if an error has ocurred
		if (data.error) {
			this.onFatalError(data.error);
			console.log(data.error);
			return;
		}
		
		// Update our copy of the server's state
		if (this._serverState.time >= data.time) {
			console.log("WARNING: Got a server response out-of-order. Discarding.");
			return;
		}
		const oldServerState = this._serverState;
		this._serverState = data;
		
		// Record the round-trip time in the client state so that the server may
		// use this information.
		this._clientState.round_trip_time = roundTrip;
		
		// Detect change in number of viewers
		const newViewers = countObjectChildren(this._serverState.clients);
		const oldViewers = countObjectChildren(oldServerState.clients);
		if (newViewers != oldViewers) {
			this.onViewersChanged(newViewers);
		}
		
		// If the server is triggered to play at some point in the future, show the
		// busy state
		if (this._serverState.video_play_on_all_ready !=
		    oldServerState.video_play_on_all_ready) {
			if (this._serverState.video_play_on_all_ready) {
				this.onBusy();
			} else if (this._clientState.ready) {
				this.onReady();
			}
		}
		
		// Is the video logically playing or not?
		const oldPlaying = (oldServerState.video_play_on_all_ready ||
		                    oldServerState.video_playing);
		const newPlaying = (this._serverState.video_play_on_all_ready ||
		                    this._serverState.video_playing);
		if (oldPlaying != newPlaying) {
			if (newPlaying) {
				this.onPlaying();
			} else {
				this.onPaused();
			}
		}
		
		if (this._serverState.video_url != oldServerState.video_url) {
			// Video URL changed
			
			// Seek to the appropriate part of the video to catch up with others
			const timeSinceStateChange = (this._serverState.time -
			                              this._serverState.state_change_time +
			                              (roundTrip/2));
			if (timeSinceStateChange > 0 && this._serverState.video_playing) {
				this.seek(this._serverState.video_time + timeSinceStateChange);
			} else {
				this.seek(this._serverState.video_time);
			}
			
			this.onVideoURLChanged(this._serverState.video_url);
		} else if (this._serverState.state_change_time != oldServerState.state_change_time) {
			// Respond to a change in desired play-state from the server.
			
			// Guess what time the server thinks it is.
			// TODO: Incrementally improve on this estimate rather than just guessing
			// from scratch on every request.
			const serverTime = this._serverState.time + (roundTrip/2.0);
			
			// Trigger a play/pause change
			const delta = this._serverState.state_change_time - serverTime;
			this._setServerPlayPauseStateAt(delta)
			
			// Seek, as the playhead may have changed
			this.onSeek(this._serverState.video_time);
			
			// Note that we've seen the state change
			this._clientState.state_change_time = this._serverState.state_change_time;
		}
	}
	
	/**
	 * Set the play/pause state at a given number of seconds into the future
	 * according to the server's play/pause state.
	 */
	_setServerPlayPauseStateAt(delta) {
		if (this._playPauseTimeoutId !== null) {
			window.clearTimeout(this._playPauseTimeoutId);
		}
		
		const setPlayPause = () => {
			this._playPauseTimeoutId = null;
			
			if (this._serverState.video_playing) {
				this.onReady();
				this.onPlay();
			} else {
				this.onPause();
			}
		};
		
		// Show the spinner to indicate playback is about to start...
		if (this._serverState.video_playing) {
			this.onBusy();
		}
		
		if (delta <= 0) {
			// Was supposed to happen now/in the past. make the change immediately.
			setPlayPause();
		} else {
			this._playPauseTimeoutId = window.setTimeout(setPlayPause, delta*1000.0)
		}
	}
	
	busy(time) {
		// If we were playing, cause other players to pause and wait while we catch
		// up...
		if (this._clientState.ready) {
			this.seek(time);
		}
		
		this._clientState.ready = false;
	}
	
	ready() {
		this._clientState.ready = true;
	}
	
	seek(time) {
		if (this._serverState.video_playing ||
		    this._serverState.video_play_on_all_ready) {
			this.play(time);
		} else {
			this.pause(time);
		}
	}
	
	play(time) {
		this._pollServer({
			command: "seek",
			time: time,
		});
		
		// Preempt server response
		this.onPause();
		this.onPlaying();
		this.onSeek(time);
		
		// Will have to wait for other players to be ready
		this.onBusy();
	}
	
	pause(time) {
		this._pollServer({
			command: "pause",
			time: time,
		});
		
		// Preempt server response
		this.onPause();
		this.onPaused();
		this.onSeek(time);
	}
	
	
	// Stubs for events to be reported by the player
	onPlay() {
		console.log(`STUB: onPlay()`);
	}
	onPause() {
		console.log(`STUB: onPause()`);
	}
	onPlaying() {
		console.log(`STUB: onPlaying()`);
	}
	onPaused() {
		console.log(`STUB: onPaused()`);
	}
	onSeek(time) {
		console.log(`STUB: onSeek(${time})`);
	}
	onBusy() {
		console.log(`STUB: onBusy()`);
	}
	onReady() {
		console.log(`STUB: onReady()`);
	}
	onViewersChanged(number) {
		console.log(`STUB: onViewersChanged(${number})`);
	}
	onVideoURLChanged(url) {
		console.log(`STUB: onVideoURLChanged("${url}")`);
	}
}

export default VideoSynchroniser;
