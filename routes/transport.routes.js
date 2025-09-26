const express = require("express");
const {
  checkLoggedIn,
  checkAuthentication,
  sessionlogout,
  registertransport,
  logintransport,
  loadtransport,
  //gettransportProfileData,
  loginapp, 
  registerapp, 
  
  
  
} = require("../controllers/transport.controller");



const router = express.Router();

router.get("/transport/register", registerapp);
router.get("/transport/login", checkLoggedIn, loginapp);
router.get("/transport/profile", checkAuthentication, loadtransport);
router.get("/transport/logout", sessionlogout);



router.post("/transport/register", registertransport);
router.post("/transport/login", logintransport);

module.exports = router;