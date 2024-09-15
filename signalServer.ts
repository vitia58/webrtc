import WebSocket from 'ws';
import Room from './models/room.model';

type TClient = WebSocket & { room: string; peerId: string };

const wss = new WebSocket.Server({ port: 8080 });

const sendFrom = (ws: TClient, data: string) => {
  const { peerIdDest } = JSON.parse(data);
  (wss.clients as Set<TClient>).forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.room === ws.room &&
      client.peerId !== ws.peerId &&
      (!peerIdDest || client.peerId === peerIdDest)
    ) {
      client.send(data);
    }
  });
};
wss.on('connection', (ws: TClient) => {
  ws.on('message', (message) => {
    const value = message.toString();
    // console.log(value);
    if (!ws.room) return;
    sendFrom(ws, value);
  });
  ws.once('message', async (message) => {
    const data = JSON.parse(message.toString());
    if (data.type === 'join') {
      const users = Array.from(wss.clients as Set<TClient>)
        .filter((client) => client.room === data.room)
        .map((client) => client.peerId);

      if (users.length == 5) {
        ws.send(
          JSON.stringify({
            type: 'full',
          }),
        );
      } else {
        ws.send(
          JSON.stringify({
            type: 'users',
            users,
          }),
        );

        ws.room = data.room;
        ws.peerId = data.peerId;

        const room = await Room.findOneAndUpdate(
          { name: data.room },
          { $inc: { usersCount: 1 } },
          { upsert: true, new: true },
        );
        if (!room) {
          await Room.create({ name: data.room, usersCount: 1 });
        }
      }
    }
  });

  ws.on('close', async () => {
    sendFrom(ws, JSON.stringify({ type: 'leave', peerIdSrc: ws.peerId }));
    if (ws.room) {
      const room = await Room.findOneAndUpdate(
        { name: ws.room },
        { $inc: { usersCount: -1 } },
        { upsert: true, new: true },
      );
      if (!room.usersCount) await room.deleteOne();
    }
  });
});
