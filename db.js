const Sequelize = require('sequelize');
const { STRING } = Sequelize;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const saltRounds = 10;

const config = {
  logging: false,
};

// variable is JWT, and the value is tokenSecret
// process.env is the object location
const tokenSecret = process.env.JWT;

if (process.env.LOGGING) {
  delete config.logging;
}
const conn = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/acme_db',
  config
);

const User = conn.define('user', {
  username: STRING,
  password: STRING,
});

const Note = conn.define('note', {
  text: STRING,
});

Note.belongsTo(User);
User.hasMany(Note);

User.beforeCreate(async (user) => {
  // console.log('user.password before----->', user.password);
  const hashedPassword = await bcrypt.hash(user.password, saltRounds);
  user.password = hashedPassword;
  // console.log('after------>', user.password);
});

User.byToken = async (token) => {
  try {
    const userObject = await jwt.verify(token, tokenSecret);
    console.log('userObject', userObject);
    if (userObject) {
      const user = await User.findByPk(userObject.userId);
      // console.log('user', user);
      return user;
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  } catch (ex) {
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
  }
};

User.authenticate = async ({ username, password }) => {
  const user = await User.findOne({
    where: {
      username,
      //   password,
    },
  });

  const match = await bcrypt.compare(password, user.password);

  if (match) {
    const token = await jwt.sign(
      {
        userId: user.id,
      },
      tokenSecret
    );
    console.log('token', token);
    return token;
  }
  const error = Error('bad credentials');
  error.status = 401;
  throw error;
};

const syncAndSeed = async () => {
  await conn.sync({ force: true });
  const credentials = [
    { username: 'lucy', password: 'lucy_pw' },
    { username: 'moe', password: 'moe_pw' },
    { username: 'larry', password: 'larry_pw' },
  ];
  const [lucy, moe, larry] = await Promise.all(
    credentials.map((credential) => User.create(credential))
  );

  const notes = [
    { text: 'Need to go grocery shopping.' },
    { text: 'Feed the cat.' },
    { text: 'Water the plants.' },
  ];

  const [grocery, cat, plants] = await Promise.all(
    notes.map((note) => Note.create(note))
  );

  await lucy.setNotes(grocery);
  await moe.setNotes(cat);
  await larry.setNotes(plants);

  return {
    users: {
      lucy,
      moe,
      larry,
    },
  };
};

module.exports = {
  syncAndSeed,
  models: {
    User,
    Note,
  },
};
