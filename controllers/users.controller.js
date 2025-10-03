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

exports.loadSelectTrip = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/users.view/select_trip.html"));
};

exports.loadBookTrip = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/users.view/book_trip.html"));
};

exports.loadTripStarted = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/users.view/trip_started.html"));
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

// ===== Book Trip =====
// exports.book_trip_generate_qr = (req, res) => {
//   const userId = req.user?.id;
//   const { paymentType } = req.body; // ⬅️ read from body

//   if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
//   if (!paymentType || !["cash", "online"].includes(paymentType)) {
//     return res.status(400).json({ success: false, message: "Invalid payment type" });
//   }

//   const sql = "INSERT INTO trips (user_id, type) VALUES (?, ?)";
//   db.query(sql, [userId, paymentType], (err, result) => {
//     if (err) {
//       console.error("Trip insert error:", err);
//       return res.status(500).json({ success: false, message: "Database error" });
//     }
//     res.status(200).json({ success: true, tripId: result.insertId, userId });
//   });
// };

exports.book_trip_generate_qr = (req, res) => {
  const userId = req.user?.id;
  const { paymentType, source, destination } = req.body;

  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  if (!paymentType || !["cash", "online"].includes(paymentType)) {
    return res.status(400).json({ success: false, message: "Invalid payment type" });
  }

  if (!source || !destination) {
    return res.status(400).json({ success: false, message: "Source and destination are required" });
  }

  const sql = "INSERT INTO trips (user_id, type, source, destination) VALUES (?, ?, ?, ?)";
  db.query(sql, [userId, paymentType, source, destination], (err, result) => {
    if (err) {
      console.error("Trip insert error:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }
    res.status(200).json({ success: true, tripId: result.insertId, userId });
  });
};



// ===== Route Fetch =====
exports.getRoute = (req, res) => {
  const { source, destination } = req.body;

  const query = `
    SELECT 
      r.id AS route_id,
      r.route_name,
      bc.name AS bus_company_name,
      bc.type AS bus_company_type,  -- ✅ Fetch type
      s1.stop_order AS source_order,
      s2.stop_order AS dest_order
    FROM routes r
    JOIN bus_companies bc ON r.company_id = bc.id
    JOIN stops s1 ON r.id = s1.route_id
    JOIN stops s2 ON r.id = s2.route_id
    WHERE LOWER(s1.stop_name) = LOWER(?) 
      AND LOWER(s2.stop_name) = LOWER(?)
      AND s1.stop_order < s2.stop_order
  `;

  db.query(query, [source, destination], (err, routeRows) => {
    if (err || routeRows.length === 0) {
      console.error("Route match error:", err || "No valid routes");
      return res.status(404).json({ success: false, message: "No valid route found" });
    }

    const allRoutes = [];
    let completed = 0;

    routeRows.forEach((row) => {
      const {
        route_id,
        source_order,
        dest_order,
        route_name,
        bus_company_name,
        bus_company_type  // ✅ Destructure type
      } = row;

      const stopQuery = `
        SELECT stop_name, latitude, longitude
        FROM stops
        WHERE route_id = ?
          AND stop_order BETWEEN ? AND ?
        ORDER BY stop_order ASC
      `;

      db.query(stopQuery, [route_id, source_order, dest_order], (err2, stops) => {
        completed++;

        if (!err2 && stops.length > 1) {
          allRoutes.push({
            route_id,
            route_name,
            bus_company_name,
            bus_company_type, // ✅ Include type in response
            stops
          });
        }

        if (completed === routeRows.length) {
          if (allRoutes.length === 0) {
            return res.status(404).json({ success: false, message: "No complete stops found" });
          }
          return res.json({ success: true, routes: allRoutes });
        }
      });
    });
  });
};





exports.proxyORS = async (req, res) => {
  try {
    const { coordinates } = req.body;

    if (
      !coordinates ||
      !Array.isArray(coordinates) ||
      !coordinates.every(
        coord => Array.isArray(coord) && coord.length === 2 && typeof coord[0] === 'number' && typeof coord[1] === 'number'
      )
    ) {
      return res.status(400).json({ error: "Invalid coordinates format" });
    }

    const orsRes = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      { coordinates },
      {
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json",
        }
      }
    );

    res.json(orsRes.data);

  } catch (err) {
    console.error("Proxy ORS error:", err.response?.data || err.message || err);
    const status = err.response?.status || 500;
    res.status(status).json({ error: "Internal server error", detail: err.response?.data || err.message });
  }
};



exports.getClosestStop = (req, res) => {
  const { lat, lng } = req.body;

  if (!lat || !lng) return res.status(400).json({ error: "Missing location" });

  const sql = `
    SELECT stop_name, latitude, longitude,
      (6371 * acos(
        cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) +
        sin(radians(?)) * sin(radians(latitude))
      )) AS distance
    FROM stops
    ORDER BY distance ASC
    LIMIT 1
  `;

  db.query(sql, [lat, lng, lat], (err, results) => {
    if (err) {
      console.error("Closest stop query failed:", err);
      return res.status(500).json({ error: "DB error" });
    }
    if (results.length === 0) return res.status(404).json({ error: "No stop found" });
    console.log(results[0]);

    res.json({ stop: results[0] });
  });
};


// Load the payment page (serve HTML with PayPal button)
exports.loadPaymentPage = (req, res) => {
  const fare = req.query.fare;
  if (!fare) {
    return res.status(400).send("Fare amount is required");
  }
  // Serve payment page, passing fare as query param or render dynamic HTML
  res.sendFile(path.join(__dirname, "../views/users.view/payment.html"));
};




// controllers/tripController.js
exports.updateTripFare = (req, res) => {
  const { tripId, fare, destination } = req.body; // 🆕 include destination
  console.log(tripId, fare, destination);

  if (!tripId || !fare) {
    return res.status(400).json({ success: false, message: "Missing tripId or fare" });
  }

  let sql, params;

  if (destination) {
    sql = "UPDATE trips SET fare = ?, destination = ? WHERE id = ?";
    params = [fare, destination, tripId];
  } else {
    sql = "UPDATE trips SET fare = ? WHERE id = ?";
    params = [fare, tripId];
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Error updating trip fare/destination:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Trip not found" });
    }

    return res.json({ success: true });
  });
};


exports.updatePaymentStatus = (req, res) => {
  const { tripId } = req.body;
  console.log("U P");
  console.log(tripId);

  if (!tripId) {
    return res.status(400).json({ success: false, message: "Missing tripId" });
  }

  const sql = "UPDATE trips SET payment_status = 'paid' WHERE id = ?";

  db.query(sql, [tripId], (err, result) => {
     console.log("U P db");
  console.log(tripId);
    if (err) {
      console.error("Error updating payment status:", err);
      return res.status(500).json({ success: false });
    }

    return res.json({ success: true });
  });
};


// In your users.controller.js or similar
exports.autocompleteStops = (req, res) => {
  const query = req.query.q;

  if (!query || query.trim().length === 0) {
    return res.json({ success: true, stops: [] }); // empty list if no query
  }

  const sql = `
    SELECT DISTINCT stop_name 
    FROM stops
    WHERE stop_name LIKE ?
    ORDER BY stop_name
    LIMIT 10
  `;

  const likeQuery = query.trim() + '%'; // match starting with typed letters

  db.query(sql, [likeQuery], (err, results) => {
    if (err) {
      console.error("Autocomplete DB error:", err);
      return res.status(500).json({ success: false, message: "DB error" });
    }

    const stopNames = results.map(row => row.stop_name);
    res.json({ success: true, stops: stopNames });
  });
};
