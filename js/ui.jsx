/**
 * UI components for QBSync (largely the video player).
 */

import React from "react";
import Measure from 'react-measure';

import VideoSynchroniser from "./sync.js";

/**
 * A button to be included in a media control bar.
 *
 * A glyphicon name must be specified by the icon prop.
 */
let MediaControlButton = React.createClass({
	render() {
		return <button type="button" className="btn" onClick={this.props.onClick}>
			<span className={"glyphicon glyphicon-" + this.props.icon}></span>
		</button>;
	}
});

/**
 * A media seek bar control with buffering indicator.
 *
 * The duration, currentTime and bufferedTime properties specify the position
 * and buffering state through the media to display.
 *
 * A callback should be added to the onSeek prop which is called with the
 * number of seconds seeked to and a boolean which is true when the mouse is
 * released.
 */
let MediaSeekBar = React.createClass({
	getDefaultProps() {
		return {
			duration: 0.0,
			currentTime: 0.0,
			bufferedTime: 0.0,
			onSeek: ()=>{},
		};
	},
	getInitialState() {
		return {
			dimensions: {},
		};
	},
	
	render() {
		let currentTimePerc, bufferedTimePerc;
		if (this.props.duration) {
			currentTimePerc = (this.props.currentTime / this.props.duration) * 100;
			bufferedTimePerc = (this.props.bufferedTime / this.props.duration) * 100;
		} else {
			currentTimePerc = 0;
			bufferedTimePerc = 0;
		}
		
		return <Measure onMeasure={(dimensions)=>this.setState({dimensions})}>
			<div className="seek-bar">
				<div className="progress" onClick={this.handleMouse}
					 onMouseDown={this.handleMouse}
					 onMouseMove={this.handleMouse}
					 onMouseUp={this.handleMouse}>
					<div className="progress-bar progress-bar-white"
						style={{width: currentTimePerc + "%"}}></div>
					<div className="progress-bar progress-bar-striped"
						style={{width: (bufferedTimePerc - currentTimePerc) + "%"}}></div>
				</div>
			</div>
		</Measure>;
	},
	
	handleMouse(event) {
		if (event.buttons || event.type === 'mouseup') {
			const x = event.pageX - this.state.dimensions.left;
			const perc = x / this.state.dimensions.width;
			this.props.onSeek(perc * this.props.duration,
			                  event.type === 'mouseup');
		}
	}
});

/**
 * A label displaying a time in seconds as hours:minutes:seconds.
 *
 * A time must be specified by the time prop.
 */
let MediaTime = React.createClass({
	render() {
		// Split hours, minutes & seconds
		const time = this.props.time;
		const h = Math.floor(time / (60*60));
		const m = Math.floor((time - (h * 60 * 60)) / 60);
		const s = Math.floor(time - (h * 60 * 60) - (m * 60));
		
		// Zero pad... oh Javascript, how you make me sad.
		const mm = (m < 10 ? "0" : "") + m;
		const ss = (s < 10 ? "0" : "") + s;
		
		return <div className="time">
			{`${h}:${mm}:${ss}`}
		</div>;
	}
});


/**
 * A video control bar featuring play/pause, current time, duration, seek bar
 * (with buffer status) and full-screen button.
 *
 * Properties:
 *  - playing: Boolean indicating if playback is ocurring
 *  - currentTime: Video position in seconds.
 *  - bufferedTime: Point after currentTime to which the player has buffered in
 *    seconds.
 *  - duration: Video duration in seconds.
 *  - hidden: Boolean: Should the bar be hidden?
 *
 * Callbacks provided as properties:
 *  - onSeek: Called with (seconds:float, mouseReleased:bool) when seeking.
 *  - onPlay: Called when play clicked
 *  - onPause: Called when pause clicked
 *  - onFullscreen: Called when full-screen clicked
 */
let MediaControlBar = React.createClass({
	getDefaultProps() {
		return {
			playing: true,
			hidden: false,
		}
	},
	
	render() {
		const playPauseIcon = this.props.playing ? "pause" : "play";
		const playPauseCallback = this.props.playing ? this.props.onPause: this.props.onPlay;
		
		const className = this.props.hidden
			? "media-control-bar hidden"
			: "media-control-bar";
		
		return <div className={className}>
			<MediaControlButton
				icon={playPauseIcon}
				onClick={playPauseCallback} />
			<MediaTime time={this.props.currentTime} />
			<MediaSeekBar
				currentTime={this.props.currentTime}
				bufferedTime={this.props.bufferedTime}
				duration={this.props.duration}
				onSeek={this.props.onSeek} />
			<MediaTime time={this.props.duration} />
			<MediaControlButton icon="fullscreen" onClick={this.props.onFullscreen} />
		</div>;
	}
});

/**
 * A box which states how many other people are viewing a video. Number set by
 * otherViewers property.
 *
 * Properties:
 *  - otherViewers: Count of other people watching
 *  - hidden: Boolean: Should the bar be hidden?
 */
let ViewerCountBox = React.createClass({
	getDefaultProps() {
		return {
			otherViewers: 0,
			hidden: false,
		};
	},
	
	render() {
		let message;
		if (this.props.otherViewers) {
			message = <span>
				<span className="counter">{this.props.otherViewers}
				</span> other viewer{this.props.otherViewers == 1 ? "" : "s"}
			</span>;
		} else {
			message = <span>No other viewers</span>;
		}
		
		const className = this.props.hidden
			? "viewer-count hidden"
			: "viewer-count";
		
		return <div className={className}>
			{message}
		</div>;
	},
});

/**
 * A spinner indicating something is loading...
 */
let Spinner = React.createClass({
	render() {
		return <div className="spinner">
			<div className="spin-cube">
				<div className="cube">
					<div className="front"></div>
					<div className="back"></div>
					<div className="top"></div>
					<div className="bottom"></div>
					<div className="left"></div>
					<div className="right"></div>
				</div>
			</div>
		</div>
	},
});

/**
 *
 * Properties:
 *  - serverURL: URL of the server
 *  - uiTimeoutDelay: Timeout before hiding the UI, in seconds
 *
 * State:
 *  - fatalError: If not null, contains an error message.
 *  - videoURL: The URL of the video
 *  - playing: Boolean indicating if playback is ocurring
 *  - currentTime: Video position in seconds.
 *  - bufferedTime: Point after currentTime to which the player has buffered in
 *    seconds.
 *  - duration: Video duration in seconds.
 *  - busy: Boolean indicating if the player is currently waiting for
 *    something to load/happen.
 *  - otherViewers: The number of other people watching the stream.
 *  - uiTimedOut: Boolean indicating if the UI has timed out
 *  - viewerTimedOut: Boolean indicating if the viewer count box has timed out
 *    (if false, the count will be shown regardless of uiTimedOut)
 */
let VideoPlayer = React.createClass({
	getDefaultProps() {
		return {
			serverURL: "sync.php",
			uiTimeoutDelay: 5.0,
		};
	},
	
	getInitialState() {
		return {
			fatalError: null,
			videoURL: null,
			playing: false,
			currentTime: 0.0,
			bufferedTime: 0.0,
			duration: 0.0,
			busy: false,
			otherViewers: 0,
			uiTimedOut: false,
			viewerTimedOut: false,
		};
	},
	
	render() {
		// Give up if an error has ocurred.
		if (this.state.fatalError) {
			return <div className="alert alert-danger" role="alert">
				<strong>Error:</strong> {this.state.fatalError}
			</div>;
		}
		
		// Hide the user-interface while it is timed out.
		const hideUI = this.state.uiTimedOut && this.state.playing;
		const hideViewerCount = hideUI && this.state.viewerTimedOut;
		
		return <figure ref={(container) => {this.container = container}} className="video-player">
			<video
					ref={(video) => {this.video = video}}
					preload="metadata"
					src={this.state.videoURL}>
				<p>Your browser does not support HTML5 video! Oh no! You might
				want to try using a browser such as Firefox or Chrome.</p>
			</video>
			<MediaControlBar
				hidden={hideUI}
				playing={this.state.playing}
				currentTime={this.state.currentTime}
				bufferedTime={this.state.bufferedTime}
				duration={this.state.duration}
				onPlay={this.handlePlayClicked} 
				onPause={this.handlePauseClicked} 
				onSeek={this.handleSeek} 
				onFullscreen={this.handleFullscreenClicked} />
			<ViewerCountBox
				hidden={hideViewerCount}
				otherViewers={this.state.otherViewers} />
			{this.state.busy ? <Spinner /> : undefined}
		</figure>;
	},
	
	handleSeek(time) {
		this.sync.seek(time);
	},
	
	handlePlayClicked() {
		this.sync.play(this.video.currentTime);
	},
	
	handlePauseClicked() {
		this.sync.pause(this.video.currentTime);
	},
	
	/**
	 * Called when the full-screen button clicked
	 */
	handleFullscreenClicked() {
		const isFullScreen = document.fullscreenElement ||
			document.mozFullscreenElement ||
			document.webkitFullscreenElement ||
			document.msFullscreenElement;
		
		if (isFullScreen) {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.mozExitFullscreen) {
				document.mozExitFullscreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			}
		} else {
			if (this.container.requestFullScreen) {
				this.container.requestFullScreen();
			} else if (this.container.mozRequestFullScreen) {
				this.container.mozRequestFullScreen();
			} else if (this.container.webkitRequestFullScreen) {
				this.container.webkitRequestFullScreen();
			} else if (this.container.msRequestFullScreen) {
				this.container.msRequestFullScreen();
			}
		}
	},
	
	/**
	 * Called when the video duration is known.
	 */
	handleDurationChange() {
		this.setState({
			duration: this.video.duration,
		});
	},
	
	/**
	 * Called frequently during playback (and infrequently while paused)
	 * and used to update play/buffer position.
	 */
	handleTimeUpdate() {
		const currentTime = this.video.currentTime;
		
		// Find out where the video is buffered up-until in the part of the video
		// currently being played.
		const buffered = this.video.buffered;
		let bufferedTime = 0.0;
		for (let i = 0; i < buffered.length; i++) {
			if (buffered.start(i) <= currentTime &&
			    buffered.end(i) >= currentTime) {
				bufferedTime = buffered.end(i);
				break;
			}
		}
		
		this.setState({currentTime, bufferedTime});
	},
	
	togglePlayPause() {
		if (this.state.playing) {
			this.sync.pause(this.video.currentTime);
		} else {
			this.sync.play(this.video.currentTime);
		}
	},
	
	/**
	 * Called whenever some user interaction indicates that the user may want to
	 * use the user interface. (Re-)sets up a timeout which hides the UI.
	 */
	resetUITimeout() {
		// Note the UI is not timed out
		this.setState({uiTimedOut: false});
		
		// Set up a timer to time out the UI after a suitable delay
		if (this.resetUITimeoutId !== null) {
			window.clearTimeout(this.resetUITimeoutId);
		}
		this.resetUITimeoutId = window.setTimeout(() => {
			this.resetUITimeoutId = null;
			this.setState({uiTimedOut: true});
		}, this.props.uiTimeoutDelay * 1000.0);
	},
	
	/**
	 * Called whenever the viewer count changes, used to force the viewer count
	 * box to be shown at times when it changes.
	 */
	resetViewerTimeout() {
		// Note the UI is not timed out
		this.setState({viewerTimedOut: false});
		
		// Set up a timer to time out the UI after a suitable delay
		if (this.resetViewerTimeoutId !== null) {
			window.clearTimeout(this.resetViewerTimeoutId);
		}
		this.resetViewerTimeoutId = window.setTimeout(() => {
			this.resetViewerTimeoutId = null;
			this.setState({viewerTimedOut: true});
		}, this.props.uiTimeoutDelay * 1000.0);
	},
	
	componentDidMount() {
		// Set up the video sync controller
		this.sync = new VideoSynchroniser(this.props.serverURL);
		this.sync.start();
		this.sync.onViewersChanged = (number) => {
			this.setState({otherViewers: number - 1});
			this.resetViewerTimeout();
		};
		this.sync.onVideoURLChanged = (url) => {
			this.setState({videoURL: url});
		};
		this.sync.onSeek = (time) => {
			this.video.currentTime = time;
			this.setState({currentTime: time});
		};
		this.sync.onPlay = () => {
			this.video.play();
		};
		this.sync.onPause = () => {
			this.video.pause();
		};
		this.sync.onPlaying = () => {
			this.setState({playing: true});
		};
		this.sync.onPaused = () => {
			this.setState({playing: false});
		};
		this.sync.onBusy = () => {
			this.setState({busy: true});
		};
		this.sync.onReady = () => {
			this.setState({busy: false});
		};
		this.sync.onFatalError = (error) => {
			this.setState({fatalError: error});
		};
		
		// Set up key bindings
		document.addEventListener("keypress", (event) => {
			// Make sure UI is kept visible while keys pressed
			this.resetUITimeout();
			
			switch (event.keyCode) {
				case 32: // Space: Play/pause toggle
					this.togglePlayPause();
					event.preventDefault();
					break;
				
				case 102: // 'f': Full-screen
					this.handleFullscreenClicked();
					event.preventDefault();
					break;
			}
		});
		
		// Make sure UI is kept visible while mouse moving
		document.addEventListener("mousemove", (event) => {
			this.resetUITimeout();
		});
		
		// Make clicking on the video toggle play/pause
		this.video.addEventListener("click", (event) => {
			this.togglePlayPause();
			this.resetUITimeout();
		});
		
		// Setup video state change notifications
		this.video.addEventListener("durationchange",
			this.handleDurationChange);
		this.video.addEventListener("timeupdate",
			this.handleTimeUpdate);
		this.video.addEventListener("canplaythrough", (e) => {
			this.sync.ready();
		});
		for (let stallEvent of ["waiting", "loadstart"]) {
			this.video.addEventListener(stallEvent, (e) => {
				this.sync.busy(this.video.currentTime);
			});
		}
		
		// Ensures background buffering while paused is reported
		this.handleTimeUpdateIntervalId = 
			window.setInterval(this.handleTimeUpdate, 1000);
		
		// A timeout set up to notice when user interaction stops and hides the UI
		this.resetUITimeoutId = null;
		this.resetUITimeout();
		
		// A timeout set up to notice when the viewer count hasn't changed in a
		// while
		this.resetViewerTimeoutId = null;
		this.resetViewerTimeout();
	},
	
	componentWillUnmount() {
		this.sync.stop();
		
		this.video.removeEventListener("durationchange",
			this.handleDurationChange);
		this.video.removeEventListener("timeupdate",
			this.handleTimeUpdate);
		
		window.clearInterval(this.handleTimeUpdateIntervalId);
		
		if (this.resetUITimeoutId !== null) {
			window.clearTimeout(this.resetUITimeoutId);
			this.resetUITimeoutId = null;
		}
		if (this.resetViewerTimeout !== null) {
			window.clearTimeout(this.resetViewerTimeout);
			this.resetViewerTimeout = null;
		}
	},
});


export default VideoPlayer;
