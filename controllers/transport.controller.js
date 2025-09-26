const path = require('path');

const db = require('../config/Database connection/db');
const bcrypt = require('bcrypt');
const passport = require('passport');


exports.registerapp = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/transport.view/register.html'));
}

exports.loginapp = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/transport.view/login.html'));
};

exports.loadtransport = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/transport.view/profile.html'));
}



exports.registertransport = async (req, res) => {
  const { registration_number, password, company_id } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = 'INSERT INTO buses (registration_number, password,company_id) VALUES (?, ?, ?)';
  db.query(sql, [registration_number, hashedPassword, company_id], (err, result) => {
    if (err) return res.status(500).send('Registration failed: ' + err.message);
    res.redirect('/transport/login');
  });
};


exports.logintransport = (req, res, next) => {
  passport.authenticate('bus-local', {
    successRedirect: '/transport/profile',
    failureRedirect: '/transport/login',
    failureFlash: true
  })(req, res, next);
};




exports.checkLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return res.redirect("/transport/profile");
  }
  next();
}

exports.checkAuthentication = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/transport/login");
}


exports.sessionlogout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy((err) => {
      if (err) return next(err);

      res.clearCookie("connect.sid"); // or your custom cookie name
      res.redirect("/transport/login");
    });
  });
};