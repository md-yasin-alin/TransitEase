const express = require("express");
const {
  checkLoggedIn,
  checkAuthentication,
  sessionlogout,
  registertransport,
  logintransport,
  loadtransport,
  gettransportProfileData,
  loginapp, 
  registerapp, 
  scan_validation,
  getClosestStop,
  getRouteStops,
  getTodayIncome,
  getSourceStop,
  getDestinationStop,
  getTripPaymentInfo,
  
  
} = require("../controllers/transport.controller");



const router = express.Router();

router.get("/transport/register", registerapp);
router.get("/transport/login", checkLoggedIn, loginapp);
router.get("/transport/profile", checkAuthentication, loadtransport);
router.get("/transport/logout", sessionlogout);

router.get("/api/transport/profile", checkAuthentication, gettransportProfileData);

router.post("/transport/register", registertransport);
router.post("/transport/login", logintransport);

// Assume you have access to req.session.busId

router.post('/api/qrscan/log', scan_validation);

// 👇 Add this new one if missing
router.post("/api/closest_stop", checkAuthentication, getClosestStop);

router.post("/api/bus/route_stops", checkAuthentication, getRouteStops);

router.get("/api/transport/income/today", checkAuthentication, getTodayIncome);

router.post("/api/trip/source-stop", checkAuthentication, getSourceStop);
router.post("/api/trip/destination-stop", checkAuthentication, getDestinationStop);


router.post("/api/trip/payment-info", checkAuthentication, getTripPaymentInfo);



module.exports = router;
