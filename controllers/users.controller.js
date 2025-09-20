const path = require("path");
const db = require("../config/Database connection/db");
const bcrypt = require("bcrypt");
const passport = require("passport");
const fetch = require("node-fetch");
const axios = require("axios");
require('dotenv').config();

// ===== Page Loaders =====
exports.registerapp = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/users.view/register.html"));
};

exports.loginapp = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/users.view/login.html"));
};

exports.loadprofile = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/users.view/profile.html"));
};



// ===== Authentication Logic =====
exports.registerUser = async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
  db.query(sql, [username, email, hashedPassword], (err) => {
    if (err) return res.status(500).send("Registration failed: " + err.message);
    res.redirect("/login");
  });
};

exports.loginUser = (req, res, next) => {
  passport.authenticate("user-local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
    failureFlash: true,
  })(req, res, next);
};

exports.checkLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) return res.redirect("/profile");
  next();
};

exports.checkAuthentication = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
};

exports.sessionlogout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie("connect.sid");
      res.redirect("/login");
    });
  });
};

// ===== User Profile API =====
exports.getUserProfileData = (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  const { username, email } = req.user;
  res.json({ username, email });
};

