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
  loadSelectTrip,
  book_trip_generate_qr,
  getRoute,
  loadBookTrip,
  proxyORS,
  loadTripStarted,
  getClosestStop,
  loadPaymentPage,
  paymentSuccess,
  updateTripFare,
  updatePaymentStatus,
  autocompleteStops
} = require("../controllers/users.controller");

// Page routes
router.get("/register", registerapp);
router.get("/login", checkLoggedIn, loginapp);
router.get("/profile", checkAuthentication, loadprofile);
router.get("/logout", sessionlogout);
router.get("/select_trip", checkAuthentication, loadSelectTrip);
router.get("/book_trip", checkAuthentication, loadBookTrip);
router.get("/trip_started", checkAuthentication, loadTripStarted);

// API routes
router.get("/api/profile", checkAuthentication, getUserProfileData);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/api/book_trip/generate_qr", checkAuthentication, book_trip_generate_qr);
router.post("/api/get_route", checkAuthentication, getRoute);
router.post("/api/proxy/ors", checkAuthentication, proxyORS); // 🆕 ORS proxy

router.post("/api/closest_stop", checkAuthentication, getClosestStop);



// Load payment page with fare query param
router.get("/payment", checkAuthentication, loadPaymentPage);

// Payment success endpoint (called from frontend after payment)

router.post("/api/trip/update_fare", updateTripFare);
router.post("/payment/success", updatePaymentStatus);

router.get('/api/stops/autocomplete', checkAuthentication, autocompleteStops);


module.exports = router;
