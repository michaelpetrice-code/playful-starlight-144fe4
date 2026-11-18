# Virtual Pub Tables · Video and live streaming

1. In your matching Supabase staging project, install the v156 table repair if Virtual Pub Tables are missing. Run `INSTALL-V167-TABLE-VIDEO.sql` in SQL Editor.
2. Upload this site ZIP to the matching Netlify staging site. Sign in on two devices with approved seats at the same table.
3. In **Table chat**, choose **Start video call**. Permit camera and microphone access when the browser asks. On the second device, choose **Join video call**. Check mute, camera off and leaving the session. Up to four members can take part in a call.
4. End the call. As the table owner or a moderator, choose **Go live**. On the second device, press **Watch live**. Viewers do not need to grant camera or mic access. Check playback, then end the stream. The stream supports one presenter and up to five viewers in the selected table.
5. Test on separate networks, such as Wi-Fi and mobile data. This build uses peer-to-peer WebRTC and a STUN server. Networks that cannot make a direct connection require TURN relay service. Configure `window.LADS_CONFIG.tableVideoIceServers` with WebRTC-compatible ICE server details before production testing on restricted networks. Only use short-lived relay credentials issued by your backend. Keep permanent TURN credentials out of frontend configuration.
6. Once calls and streams pass on both devices, run the same SQL on the production project's database and deploy the tested site build.

Sessions are limited to approved table members and expire when the host disconnects without ending the session. Streams are view-only for members, without a public link or recording. Members can still use table chat while watching.
