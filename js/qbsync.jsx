import React from 'react';
import ReactDOM from 'react-dom';

import VideoPlayer from "./ui.jsx";

const urlIdRegex = /^.*\/v\/([a-zA-Z0-9]+)$/;
const [_, id]  = window.location.href.match(urlIdRegex);
const serverURL = `/v/${id}/sync`;

ReactDOM.render(<div>
	<VideoPlayer serverURL={serverURL} />
</div>, document.getElementById("video-player"));
