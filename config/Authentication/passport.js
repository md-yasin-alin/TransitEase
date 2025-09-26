const LocalStrategy = require('passport-local').Strategy;
const db = require('../Database connection/db'); // adjust path as needed
const bcrypt = require('bcrypt');

module.exports = function (passport) {
  passport.use('user-local', new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
      if (err) return done(err);
      if (!results.length) return done(null, false, { message: 'User not found' });

      const user = results[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) return done(null, false, { message: 'Wrong password' });

      user.source = 'users'; // track which table it's from
      return done(null, user);
    });
  }));

  passport.use('bus-local', new LocalStrategy({ usernameField: 'registration_number' }, (registration_number, password, done) => {
    db.query('SELECT * FROM buses WHERE registration_number = ?', [registration_number], async (err, results) => {
      if (err) return done(err);
      if (!results.length) return done(null, false, { message: 'Bus not found' });

      const bus = results[0];
      const match = await bcrypt.compare(password, bus.password);
      if (!match) return done(null, false, { message: 'Wrong password' });

      bus.source = 'buses';
      return done(null, bus);
    });
  }));



  passport.serializeUser((user, done) => {
    // Store both id and source (users or buses)
    done(null, { id: user.id, source: user.source });
  });

  passport.deserializeUser((key, done) => {
    const { id, source } = key;
    const table = source === 'buses' ? 'buses' : 'users';

    db.query(`SELECT * FROM ${table} WHERE id = ?`, [id], (err, results) => {
      if (err) return done(err);
      if (results.length === 0) return done(null, false);
      const user = results[0];
      user.source = source; // store source in session user object
      done(null, user);
    });
  });

};
