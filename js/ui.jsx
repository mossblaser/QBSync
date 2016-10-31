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
		}
	},
	
	render() {
		const playPauseIcon = this.props.playing ? "pause" : "play";
		const playPauseCallback = this.props.playing ? this.props.onPause: this.props.onPlay;
		
		return <div className="media-control-bar">
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
 */
let ViewerCountBox = React.createClass({
	getDefaultProps() {
		return {otherViewers: 0};
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
		
		return <div className="viewer-count">
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
 *
 * State:
 *  - videoURL: The URL of the video
 *  - playing: Boolean indicating if playback is ocurring
 *  - currentTime: Video position in seconds.
 *  - bufferedTime: Point after currentTime to which the player has buffered in
 *    seconds.
 *  - duration: Video duration in seconds.
 *  - busy: Boolean indicating if the player is currently waiting for
 *    something to load/happen.
 *  - otherViewers: The number of other people watching the stream.
 */
let VideoPlayer = React.createClass({
	getDefaultProps() {
		return {
			// XXX: TODO: Choose something based on current URL!
			serverURL: "./test.php",
		};
	},
	
	getInitialState() {
		return {
			videoURL: null,
			playing: false,
			currentTime: 0.0,
			bufferedTime: 0.0,
			duration: 0.0,
			busy: false,
			otherViewers: 0,
		};
	},
	
	render() {
		return <figure ref={(container) => {this.container = container}} className="video-player">
			<video
					ref={(video) => {this.video = video}}
					preload="metadata"
					src={this.state.videoURL}>
				<p>Your browser does not support HTML5 video! Oh no! You might
				want to try using a browser such as Firefox or Chrome.</p>
			</video>
			<MediaControlBar
				playing={this.state.playing}
				currentTime={this.state.currentTime}
				bufferedTime={this.state.bufferedTime}
				duration={this.state.duration}
				onPlay={this.handlePlayClicked} 
				onPause={this.handlePauseClicked} 
				onSeek={this.handleSeek} 
				onFullscreen={this.handleFullscreenClicked}
				/>
			<ViewerCountBox otherViewers={this.state.otherViewers} />
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
	
	componentDidMount() {
		// Set up the video sync controller
		this.sync = new VideoSynchroniser(this.props.serverURL);
		this.sync.start();
		this.sync.onViewersChanged = (number) => {
			this.setState({otherViewers: number - 1});
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
		
		// Set up key bindings
		document.addEventListener("keypress", (event) => {
			switch (event.keyCode) {
				case 32: // Space: Play/pause toggle
					if (this.state.playing) {
						this.sync.pause(this.video.currentTime);
					} else {
						this.sync.play(this.video.currentTime);
					}
					event.preventDefault();
					break;
				
				case 102: // 'f': Full-screen
					this.handleFullscreenClicked();
					event.preventDefault();
					break;
			}
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
	},
	componentWillUnmount() {
		this.sync.stop();
		
		this.video.removeEventListener("durationchange",
			this.handleDurationChange);
		this.video.removeEventListener("timeupdate",
			this.handleTimeUpdate);
		
		window.clearInterval(this.handleTimeUpdateIntervalId);
	},
});


export default VideoPlayer;
