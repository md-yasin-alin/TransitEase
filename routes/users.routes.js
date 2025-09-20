const express = require("express");
const router = express.Router();
const {
  registerapp,
  loginapp,
  loadprofile,
  registerUser,
  loginUser,
  checkLoggedIn,
  checkAuthentication,
  sessionlogout,
  getUserProfileData,

} = require("../controllers/users.controller");

// Page routes
router.get("/register", registerapp);
router.get("/login", checkLoggedIn, loginapp);
router.get("/profile", checkAuthentication, loadprofile);
router.get("/logout", sessionlogout);


// API routes
router.get("/api/profile", checkAuthentication, getUserProfileData);
router.post("/register", registerUser);
router.post("/login", loginUser);



module.exports = router;
