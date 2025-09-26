<<<<<<< HEAD
require('dotenv').config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");


const userRouter = require("./routes/users.routes"); // ✅ make sure this file exists and path is correct


const app = express();
const PORT = 3000;

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("views"));

// Session store config
const sessionStore = new MySQLStore({
  host: 'localhost',
  user: 'root',
  password: '', // Your MySQL password
  database: 'qr_code_transit',
});

app.use(session({
  key: 'connect.sid',
  secret: 'your_secret_key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  }
}));

// Passport setup
require("./config/Authentication/passport")(passport); // ✅ make sure this file exists
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use(userRouter);



//Home page
app.use("/", (req, res) => {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('URL not found');
});

// Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


=======
require('dotenv').config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const passport = require("passport");


const userRouter = require("./routes/users.routes"); // ✅ make sure this file exists and path is correct


const app = express();
const PORT = 3000;

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("views"));

// Session store config
const sessionStore = new MySQLStore({
  host: 'localhost',
  user: 'root',
  password: '', // Your MySQL password
  database: 'qr_code_transit',
});

app.use(session({
  key: 'connect.sid',
  secret: 'your_secret_key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  }
}));

// Passport setup
require("./config/Authentication/passport")(passport); // ✅ make sure this file exists
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use(userRouter);



//Home page
app.use("/", (req, res) => {
  res.sendFile(path.join(__dirname, '/views/index.html'));
});

// 404 Handler
app.use((req, res) => {
  res.status(404).send('URL not found');
});

// Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});


>>>>>>> yasin/features
