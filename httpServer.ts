import express from 'express';
import * as exphbs from 'express-handlebars';
import path from 'path';
import { connect } from 'mongoose';
import { config } from 'dotenv';
import Room from './models/room.model';

config();
const connection = connect(process.env.DB_URI!)
  .catch((err) => {
    throw new Error(err);
  })
  .then(async () => {
    await Room.deleteMany({});
  });

const app = express();
const port = 3000;

app.engine('hbs', exphbs.engine({ extname: 'hbs' }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
  const rooms = (await Room.find()).map((room) => room.toJSON()); /*Array.from(
    new Set(
      Array.from(wss.clients as Set<TClient>).map((client) => client.room)
    )
  ).map((room) => ({ name: room }));*/
  console.log(rooms);
  res.render('rooms', { rooms, layout: false });
});

app.get('/room', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/room.html'));
});

connection.then(() => {
  app.listen(port, () => {
    require('./signalServer');
    console.log(`Server running on http://localhost:${port}`);
  });
});
