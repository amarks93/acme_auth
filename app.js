const express = require('express');
const app = express();
app.use(express.json());
const {
  models: { User, Note },
} = require('./db');
const path = require('path');

const requireToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const user = await User.byToken(token);
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/api/auth', async (req, res, next) => {
  try {
    res.send({ token: await User.authenticate(req.body) });
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/auth', requireToken, async (req, res, next) => {
  try {
    // res.send(await User.byToken(req.headers.authorization));
    console.log('REQUSERRR', req.user);
    res.send(req.user);
  } catch (ex) {
    next(ex);
  }
});

app.get('/api/users/:userId/notes', requireToken, async (req, res, next) => {
  try {
    // const tokenData = await User.byToken(req.headers.authorization);
    // console.log(tokenData);
    if (req.user.id === +req.params.userId) {
      const userWithNotes = await User.findByPk(req.params.userId, {
        include: {
          model: Note,
        },
      });
      res.send(userWithNotes.notes);
    } else {
      res.sendStatus(403);
    }
  } catch (ex) {
    next(ex);
  }
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status || 500).send({ error: err.message });
});

module.exports = app;

// 1, app post user info ---> server
//2, verify user indo --- >if correct ----> create and send back token
//3,client storage the token
//4, client send req (https?) with token,
// 5, server verify token --->if correct ----> response
