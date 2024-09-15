const localVideo = document.getElementById('localVideo');
const videos = document.getElementById('videos');
const mic = document.getElementById('mic');
const cam = document.getElementById('cam');

let localStream = new MediaStream();
let signalingServer = connect();
const peerConnections = {};
const peerIdSrc = 'peer' + Math.floor(Math.random() * 1000);
const buffer = [];

function connect() {
  let instance = new WebSocket('ws://192.168.3.1:8080');
  const onClose = () => {
    setTimeout(() => {
      instance = connect();
    }, 1000);
  };

  instance.addEventListener('close', onClose);
  instance.addEventListener('message', onMessage);
  instance.addEventListener('open', () => {
    instance.send(
      JSON.stringify({
        peerId: peerIdSrc,
        room: location.search.match(/room=([^&]*)/)[1],
        type: 'join',
      }),
    );

    buffer.forEach((data) => instance.send(data));
    buffer.splice(0);

    signalingServer = instance;
  });
  return instance;
}
function sendTo(peerIdDest, data) {
  const value = JSON.stringify({ peerIdSrc, peerIdDest, ...data });

  if (signalingServer.readyState === WebSocket.OPEN) {
    signalingServer.send(value);
  } else {
    buffer.push(value);
  }
}

async function startMedia() {
  if (localStream.active) return false;

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = localStream;

  const toggleTable = { On: true, Off: false };

  mic.onclick = () => {
    const value = toggleTable[mic.getAttribute('toggle')];
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !value;
    });

    mic.setAttribute('toggle', value ? 'Off' : 'On');
  };

  cam.onclick = () => {
    const value = toggleTable[cam.getAttribute('toggle')];
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !value;
    });

    cam.setAttribute('toggle', value ? 'Off' : 'On');
  };

  return true;
}

async function onMessage(message) {
  const data = JSON.parse(message.data);

  const peerIdDest = data.peerIdSrc;
  const peerConnection = getPeerConnection(peerIdDest);

  if (data.offer) {
    console.log('Received offer from peer:', peerIdDest);
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.offer),
    );

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendTo(peerIdDest, { answer });
    
  } else if (data.answer) {
    console.log('Received answer from peer:', peerIdDest);
    await peerConnection.setRemoteDescription(
      new RTCSessionDescription(data.answer),
    );
  } else if (data.candidate) {
    console.log('Adding ICE candidate from peer:', peerIdDest);
    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  } else if (data.type === 'leave') {
    console.log('Received leave message from peer:', peerIdDest);
    peerConnection.close();
    delete peerConnections[peerIdDest];

    const element = document.getElementById(`remoteVideo_${peerIdDest}`);
    if (element) {
      element.parentElement.remove();
      videos.setAttribute(
        'length',
        parseInt(videos.getAttribute('length')) - 1,
      );
    }
  } else if (data.type === 'users') {
    if (await startMedia()) {
      console.log('Received users:', data.users);
      data.users.forEach((user) => {
        if (user !== peerIdSrc) {
          createOffer(user);
        }
      });
    }
  } else if (data.type === 'full') {
    document.getElementById('room-full').style.display = 'flex';
  }
}

function getPeerConnection(peerIdDest) {
  if (peerConnections[peerIdDest]) return peerConnections[peerIdDest];

  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };
  const peerConnection = new RTCPeerConnection(configuration);

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      sendTo(peerIdDest, { candidate: event.candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    let remoteVideo = document.getElementById(`remoteVideo_${peerIdDest}`);

    if (!remoteVideo) {
      remoteVideo = document.createElement('video');
      remoteVideo.id = `remoteVideo_${peerIdDest}`;
      remoteVideo.autoplay = true;
      remoteVideo.playsinline = true;

      const div = document.createElement('div');
      div.className = 'video-container';
      div.appendChild(remoteVideo);

      videos.appendChild(div);
      videos.setAttribute('length', +videos.getAttribute('length') + 1);
    }

    if (!remoteVideo.srcObject) {
      remoteVideo.srcObject = new MediaStream();
    }

    event.streams[0].getTracks().forEach((track) => {
      remoteVideo.srcObject.addTrack(track);
    });
  };

  peerConnections[peerIdDest] = peerConnection;

  return peerConnection;
}

async function createOffer(peerIdDest) {
  const peerConnection = getPeerConnection(peerIdDest);
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  sendTo(peerIdDest, { offer });
}
