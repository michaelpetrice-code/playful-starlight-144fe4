async function gatherDescription(connection, type) {
  await connection.setLocalDescription(type === 'offer' ? await connection.createOffer() : await connection.createAnswer());
  if (connection.iceGatheringState !== 'complete') {
    await new Promise(resolve => {
      const finish = () => {
        clearTimeout(timeout);
        connection.removeEventListener('icegatheringstatechange', changed);
        connection.removeEventListener('signalingstatechange', changed);
        resolve();
      };
      const changed = () => {
        if (connection.iceGatheringState === 'complete' || connection.signalingState === 'closed') finish();
      };
      const timeout = setTimeout(finish, 9000);
      connection.addEventListener('icegatheringstatechange', changed);
      connection.addEventListener('signalingstatechange', changed);
      changed();
    });
  }
  return connection.localDescription?.sdp;
}

export function bindTableVideo(root, sb, iceServers) {
  const controls = Object.fromEntries([...root.querySelectorAll('[data-video]')].map(node => [node.dataset.video,node]));
  const supported = typeof RTCPeerConnection === 'function';
  const canCapture = Boolean(navigator.mediaDevices?.getUserMedia);
  let client = crypto.randomUUID();
  const peers = new Map();
  let table, current, joined, media, timer, moderator = false, pending, failedSetup, message = '';
  let lastHeartbeat = 0;

  async function rpc(name, args) {
    const {data,error} = await sb.rpc(name,args);
    if (error) throw error;
    return data;
  }

  const roomRequest = (action, tableId, roomId, clientId = client) => rpc('tl_video_room', {
    p_table:tableId,p_client:clientId,p_action:action,p_room:roomId ?? null
  });

  function draw() {
    root.hidden = !table;
    controls.call.hidden = Boolean(current || joined) || !canCapture;
    controls.stream.hidden = Boolean(current || joined) || !moderator || !canCapture;
    controls.join.hidden = !current || Boolean(joined) || (current.kind === 'call' && !canCapture);
    controls.join.textContent = current?.kind === 'stream' ? 'Watch live' : 'Join video call';
    controls.leave.hidden = !joined;
    controls.leave.textContent = current?.host ? 'End session' : 'Leave session';
    controls.mic.hidden = controls.camera.hidden = !media;
    controls.mic.textContent = media?.getAudioTracks().some(track=>track.enabled) ? 'Mute mic' : 'Unmute mic';
    controls.camera.textContent = media?.getVideoTracks().some(track=>track.enabled) ? 'Camera off' : 'Camera on';
    for (const key of ['call','stream','join']) controls[key].disabled = !supported || Boolean(pending || failedSetup);
    controls.status.textContent = message || (!supported ? 'Use a browser that supports video calls.' :
      joined ? (current?.kind === 'stream' ? (current.host ? 'You’re live to this table.' : 'Watching this table’s live stream.') : 'Video call in progress.') :
      current ? (current.kind === 'stream' ? 'This table is live.' : 'This table has a video call.') : '');
  }

  function removePeer(id) {
    const peer = peers.get(id);
    if (!peer) return;
    peer.connection.close();
    peer.tile.remove();
    peers.delete(id);
  }

  function resetSession() {
    for (const id of peers.keys()) removePeer(id);
    for (const track of media?.getTracks() || []) track.stop();
    media = null;
    controls.self.srcObject = null;
    controls.self.hidden = true;
    joined = null;
  }

  function leave() {
    const tableId = table;
    const roomId = joined;
    const previousClient = client;
    client = crypto.randomUUID();
    pending = null;
    resetSession();
    current = null;
    message = '';
    draw();
    if (roomId && tableId) roomRequest('leave',tableId,roomId,previousClient).catch(()=>{});
  }

  function attachPeer(person) {
    const connection = new RTCPeerConnection({iceServers});
    const tile = document.createElement('figure');
    const video = document.createElement('video');
    const caption = document.createElement('figcaption');
    video.autoplay = video.playsInline = video.controls = true;
    caption.textContent = person.name;
    tile.append(video,caption);
    controls.remote.append(tile);
    connection.ontrack = event => {
      video.srcObject = event.streams[0] || new MediaStream([event.track]);
      video.play().catch(()=>{});
    };
    for (const track of media?.getTracks() || []) {
      if (current?.kind === 'stream') connection.addTransceiver(track,{direction:'sendonly',streams:[media]});
      else connection.addTrack(track,media);
    }
    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      caption.textContent = person.name + (state === 'connected' ? '' :
        state === 'failed' ? ' · Connection failed. Leave and rejoin to retry.' : ' · Connecting…');
    };
    const peer = {connection,tile,offered:false,answering:false};
    peers.set(person.id,peer);
    return peer;
  }

  async function signal(id, peer, kind, roomId) {
    const sdp = await gatherDescription(peer.connection,kind);
    if (sdp && joined === roomId && peers.get(id) === peer) {
      await rpc('tl_video_signal',{p_room:roomId,p_client:client,p_peer:id,p_kind:kind,p_sdp:sdp});
    }
  }

  function syncPeers(room) {
    const visible = room.peers.filter(person => room.kind === 'call' || room.host || person.host);
    for (const id of peers.keys()) if (!visible.some(person=>person.id===id)) removePeer(id);
    for (const person of visible) {
      const offerer = room.kind === 'stream' ? room.host : client < person.id;
      const incoming = room.signals.find(row=>row.sender===person.id && row.kind===(offerer?'answer':'offer'));
      const peer = peers.get(person.id) || attachPeer(person);
      const {connection} = peer;
      let operation;
      if (offerer && !peer.offered) {
        peer.offered = true;
        operation = signal(person.id,peer,'offer',room.id);
      } else if (incoming && !peer.answering && !connection.remoteDescription) {
        peer.answering = true;
        operation = connection.setRemoteDescription({type:incoming.kind,sdp:incoming.sdp}).then(() => {
          if (!offerer) return signal(person.id,peer,'answer',room.id);
        });
      }
      operation?.catch(error => {
        if (peers.get(person.id) !== peer) return;
        peer.tile.querySelector('figcaption').textContent = person.name + ' · Connection failed. Leave and rejoin to retry.';
        console.warn('Table video negotiation failed', error.name);
      });
    }
  }

  async function poll() {
    clearTimeout(timer);
    const tableId = table;
    if (!tableId || !supported) return;
    const pollClient = client;
    const pollRoom = joined;
    try {
      const room = await roomRequest('status',tableId,pollRoom,pollClient);
      if (table !== tableId || client !== pollClient || joined !== pollRoom || pending) return;
      lastHeartbeat = Date.now();
      if (message.startsWith('Couldn’t check') || failedSetup) message = '';
      failedSetup = false;
      if (joined && (!room?.joined || room.id !== joined)) {
        resetSession();
        message = 'The video session has ended.';
      }
      current = room;
      if (joined) syncPeers(room);
    } catch (error) {
      if (table !== tableId || client !== pollClient || joined !== pollRoom || pending) return;
      failedSetup = ['PGRST202','42883'].includes(error.code);
      if (/membership is required/i.test(error.message || '') || (joined && Date.now() - lastHeartbeat > 20000)) resetSession();
      message = failedSetup ? 'Table video is awaiting database setup.' : 'Couldn’t check table video. Retrying…';
    } finally {
      if (table === tableId) {
        draw();
        clearTimeout(timer);
        timer = setTimeout(poll,joined ? 1800 : 5000);
      }
    }
  }

  async function start(action) {
    if (pending || joined || !table) return;
    const attempt = Symbol();
    const tableId = table;
    const requested = current;
    const attemptClient = client;
    pending = attempt;
    message = 'Connecting…';
    draw();
    let preview;
    try {
      if (action !== 'join' || requested?.kind !== 'stream') {
        preview = await navigator.mediaDevices.getUserMedia({audio:true,video:{width:{ideal:640},height:{ideal:360},frameRate:{ideal:20}}});
      }
      if (pending !== attempt) return;
      const room = await roomRequest(action,tableId,requested?.id,attemptClient);
      if (pending !== attempt) {
        if (room?.id) roomRequest('leave',tableId,room.id,attemptClient).catch(()=>{});
        return;
      }
      current = room;
      joined = room.id;
      lastHeartbeat = Date.now();
      media = preview;
      preview = null;
      controls.self.hidden = !media;
      controls.self.srcObject = media;
      message = '';
      syncPeers(room);
    } catch (error) {
      if (pending === attempt) {
        message = error.name === 'NotAllowedError' ? 'Allow camera and microphone access in your browser to start video.' :
          error.name === 'NotFoundError' ? 'A camera and microphone are needed to start video.' : error.message || 'Video is unavailable.';
      }
    } finally {
      for (const track of preview?.getTracks() || []) track.stop();
      if (pending === attempt) {
        pending = null;
        draw();
      }
    }
  }

  controls.call.onclick = () => start('call');
  controls.stream.onclick = () => start('stream');
  controls.join.onclick = () => start('join');
  controls.leave.onclick = leave;
  for (const [key,kind] of [['mic','audio'],['camera','video']]) controls[key].onclick = () => {
    for (const track of media?.getTracks().filter(item=>item.kind===kind) || []) track.enabled = !track.enabled;
    draw();
  };

  return {
    setTable(id, isModerator) {
      moderator = isModerator;
      if (table !== id) {
        clearTimeout(timer);
        leave();
        table = id;
        failedSetup = false;
        if (id) poll();
      }
      draw();
    }
  };
}
