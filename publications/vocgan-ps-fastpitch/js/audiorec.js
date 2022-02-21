//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

var record_url = document.getElementById("upload_url").value;
var recordButton = document.getElementById("recordButton");
var recIcon = document.getElementById("recIcon");
// var stopButton = document.getElementById("stopButton");
var loader = document.getElementById("loader");
loader.onload = function() {loader.style.display = 'none';}

// target 선택 값
var select = document.getElementById("target");

// target 선택 값 변경 listener
var list_targets = document.querySelectorAll('.target-change').forEach(element => {
	element.onchange = targetChangeHandler;
})

// var pauseButton = document.getElementById("pauseButton");

//add events to those 2 buttons
var isRec=false;
recordButton.addEventListener("click", recordeAction);
// stopButton.addEventListener("click", stopRecording);
// pauseButton.addEventListener("click", pauseRecording);

function recordeAction(){
	if(isRec){
		stopRecording()
	}else{
		startRecording()
	}
}

function startRecording() {
	console.log("recordButton clicked");

	/*
		Simple constraints object, for more advanced audio features see
		https://addpipe.com/blog/audio-constraints-getusermedia/
	*/
    
    var constraints = { audio: true, video:false }

 	/*
    	Disable the record button until we get a success or fail from getUserMedia() 
	*/

	// recordButton.disabled = true;
	// stopButton.disabled = false;
	// pauseButton.disabled = false

	/*
    	We're using the standard promise based getUserMedia() 
    	https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

	navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
		// 타겟 선택 안했으면 예외처리
		if (select.value == '') {
			recText.innerHTML = "타겟을 선택하세요"
			return;
		}
		isRec=true;
		recordButton.className = "btn btn-large";
		recIcon.className = "fa fa-stop-circle material-icons left"
		recText.innerHTML = "중지"

		console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

		/*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
		audioContext = new AudioContext();

		//update the format 
		// 녹음포맷 log table 위에 표시
		document.getElementById("formats").innerHTML="Format: 1 channel wav @ "+audioContext.sampleRate/1000+"kHz"

		/*  assign to gumStream for later use  */
		gumStream = stream;
		
		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);

		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input,{numChannels:1})

		//start the recording process
		rec.record()

		console.log("Recording started");

	}).catch(function(err) {	// 마이크 없을때 실행
		isRec=false;
		recordButton.className = "btn btn-large";
		recText.innerHTML = "마이크 없음"
	  	//enable the record button if getUserMedia() fails
    	// recordButton.disabled = false;
    	// stopButton.disabled = true;
    	// pauseButton.disabled = true
	});
}

// function pauseRecording(){
// 	console.log("pauseButton clicked rec.recording=",rec.recording );
// 	if (rec.recording){
// 		//pause
// 		rec.stop();
// 		pauseButton.innerHTML="Resume";
// 	}else{
// 		//resume
// 		rec.record()
// 		pauseButton.innerHTML="Pause";

// 	}
// }

function stopRecording() {
	console.log("stopButton clicked");
	//disable the stop button, enable the record too allow for new recordings
	// stopButton.disabled = true;
	// recordButton.disabled = false;
	// pauseButton.disabled = true;
	isRec=false;
	recordButton.className = "btn btn-large";
	recIcon.className = "fa fa-microphone material-icons left"
	recText.innerHTML = "녹음"
	loader.style.visibility = "visible";

	//reset button just in case the recording is stopped while paused
	// pauseButton.innerHTML="Pause";
	
	//tell the recorder to stop the recording
	rec.stop();

	//stop microphone access
	gumStream.getAudioTracks()[0].stop();

	//create the wav blob and pass it on to createDownloadLink
	// rec.exportWAV(createDownloadLink);
	// Wav 파일 생성, db 업데이트
	rec.exportWAV(uploadfile)
}

function uploadfile(blob){
	var filename = new Date().toISOString();
	var xhr=new XMLHttpRequest();
	xhr.onload=function(e) {
		if(this.readyState === 4) {
			location.reload();
			// console.log("Server returned: ",e.target.responseText);
		}else{
			console.log("!!ERR!!");
		}
		loader.onload = function() {loader.style.display = 'none';}
	};
	var fd=new FormData();
	fd.append("audio_data", blob, filename+".wav");
	fd.append("selected_target", select.value);
	xhr.open("POST",record_url,true);
	xhr.send(fd);
	console.log(fd);
}

function targetChangeHandler() {
	console.log("target changed");
	loader.style.visibility = "visible";
	var xhr = new XMLHttpRequest();
	xhr.onload = function (e) {
		if (this.readyState === 4) {
			location.reload();
			// console.log("Server returned: ",e.target.responseText);
		} else {
			console.log("!!ERR!!");
		}
		loader.onload = function () { loader.style.display = 'none'; }
	};
	var fd = new FormData();
	fd.append("selected_target", this.value);
	xhr.open("POST", "/demo/reset_record/" + this.id, true);
	xhr.send(fd);
}