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
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO buses (registration_number, password,company_id) VALUES (?, ?, ?)';
    
    db.query(sql, [registration_number, hashedPassword, company_id], (err, result) => {
      if (err) {
        console.error("Transport registration error:", err);
        return res.redirect('/transport/register?error=' + encodeURIComponent('Registration failed. Please try again.'));
      }
      res.redirect('/transport/login?success=' + encodeURIComponent('Registration successful! Please log in.'));
    });
  } catch (error) {
    console.error("Transport registration error:", error);
    res.redirect('/transport/register?error=' + encodeURIComponent('Registration failed. Please try again.'));
  }
};


exports.logintransport = (req, res, next) => {
  passport.authenticate('bus-local', {
    successRedirect: '/transport/profile',
    failureRedirect: '/transport/login?error=' + encodeURIComponent(req.flash('error')[0] || 'Invalid registration number or password'),
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


exports.gettransportProfileData = (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { registration_number, company_id } = req.user;

  const sql = `
  SELECT name 
  FROM bus_companies 
  WHERE id = ?
  LIMIT 1
`;

  db.query(sql, [company_id], (err, result) => {
    if (err) {
      console.error("Error fetching company name:", err);
      return res.status(500).json({ error: "Database error" });
    }

    const company_name = result.length ? result[0].name : "Unknown Company";
    res.json({ registration_number, company_id, company_name });
  });

};


// exports.scan_validation = (req, res) => {
//   const busId = req.user?.id;
//   const { tripId, userId } = req.body;

//   console.log(tripId);
//   console.log(userId);
//   console.log(busId);

//   if (!tripId || !userId || !busId) {
//     console.log("here");
//     return res.status(400).json({ error: 'Missing parameters.' });
//   }
//   // Update bus_id in the trip
//   const updateBusSql = 'UPDATE trips SET bus_id = ? WHERE id = ? AND user_id = ?';
//   db.query(updateBusSql, [busId, tripId, userId], (err) => {
//     if (err) {
//       console.error('Error updating bus_id:', err);
//       return res.status(500).json({ error: 'Failed to update bus ID' });
//     }
//   });

exports.scan_validation = (req, res) => {
  const busId = req.user?.id;
  const { tripId, userId } = req.body;

  console.log(tripId);
  console.log(userId);
  console.log(busId);

  if (!tripId || !userId || !busId) {
    console.log("here");
    return res.status(400).json({ error: 'Missing parameters.' });
  }

  // ✅ Update bus_id and created_at when trip is first scanned
  const updateBusSql = `
    UPDATE trips 
    SET bus_id = ?, created_at = NOW() 
    WHERE id = ? AND user_id = ? AND bus_id IS NULL
  `;
  db.query(updateBusSql, [busId, tripId, userId], (err) => {
    if (err) {
      console.error('Error updating bus_id:', err);
      return res.status(500).json({ error: 'Failed to update bus ID' });
    }
  });

  // 👇 Rest of your validation logic continues unchanged...


  const getTripSql = 'SELECT status FROM trips WHERE id = ? AND user_id = ?';
  db.query(getTripSql, [tripId, userId], (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Server error' });
    }

    if (!results.length) {
      return res.status(404).json({ error: 'Trip not found.' });
    }

    const trip = results[0];
    console.log(trip);
    if (trip.status === 'completed') {
      return res.json({ status: 'blocked' });
    }

    let scanType = '';
    let newStatus = '';

    if (trip.status === 'pending') {
      scanType = 'entry';
      newStatus = 'started';
    } else if (trip.status === 'started') {
      scanType = 'exit';
      newStatus = 'completed';
    } else {
      // If status is something else, just return error or block
      return res.status(400).json({ error: 'Invalid trip status for scanning.' });
    }

    const insertLogSql = `
      INSERT INTO qr_logs (user_id, bus_id, trip_id, scan_type)
      VALUES (?, ?, ?, ?)
    `;

    db.query(insertLogSql, [userId, busId, tripId, scanType], (err2) => {
      if (err2) {
        console.error('DB error inserting log:', err2);
        return res.status(500).json({ error: 'Server error' });
      }

      const updateTripSql = 'UPDATE trips SET status = ? WHERE id = ?';

      db.query(updateTripSql, [newStatus, tripId], (err3) => {
        if (err3) {
          console.error('DB error updating trip status:', err3);
          return res.status(500).json({ error: 'Server error' });
        }

        return res.json({ status: scanType + '_logged' });
      });
    });
  });
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


exports.getRouteStops = (req, res) => {
  // Assume busId is from logged in user (like req.user.id or req.session.busId)
  // You can adjust as needed, or pass busId in req.body or req.query if public

  const busId = req.user?.id || req.body.busId;
  if (!busId) {
    return res.status(400).json({ error: "Bus ID is required" });
  }

  // First get route_id for the bus
  const getRouteIdSql = `
    SELECT r.id AS route_id 
    FROM buses b
    JOIN routes r ON b.company_id = r.company_id
    WHERE b.id = ?
    LIMIT 1
  `;

  db.query(getRouteIdSql, [busId], (err, routeResult) => {
    if (err) {
      console.error("DB error getting route_id:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (!routeResult.length) {
      return res.status(404).json({ error: "Route not found for bus" });
    }

    const routeId = routeResult[0].route_id;

    // Now get all stops for that route ordered by stop_order
    const getStopsSql = `
      SELECT id, stop_name, latitude, longitude, stop_order 
      FROM stops 
      WHERE route_id = ? 
      ORDER BY stop_order ASC
    `;

    db.query(getStopsSql, [routeId], (err2, stopsResult) => {
      if (err2) {
        console.error("DB error getting stops:", err2);
        return res.status(500).json({ error: "Database error" });
      }

      if (!stopsResult.length) {
        return res.status(404).json({ error: "No stops found for route" });
      }

      res.json({ stops: stopsResult });
    });
  });
};

exports.getTodayIncome = (req, res) => {
  const busId = req.user?.id;
  if (!busId) return res.status(401).json({ error: "Unauthorized" });

  const sql = `
    SELECT 
      t.id AS trip_id,
      COALESCE(t.fare,0) AS amount,
      t.type AS payment_type
    FROM trips t
    WHERE t.bus_id = ?
      AND t.status = 'completed'
      AND DATE(t.created_at) = CURDATE()
  `;

  db.query(sql, [busId], (err, results) => {
    if (err) {
      console.error("Income fetch failed:", err);
      return res.status(500).json({ error: "Database error" });
    }

    if (!results.length) {
      return res.json({
        total: 0,
        cash: 0,
        online: 0,
        cashDetails: [],
        onlineDetails: []
      });
    }

    let total = 0, cash = 0, online = 0;
    const cashDetails = [], onlineDetails = [];

    results.forEach(trip => {
      const amount = parseFloat(trip.amount) || 0;

      if (trip.payment_type === "cash") {
        cash += amount;
        cashDetails.push({ trip_id: trip.trip_id, amount });
      } else if (trip.payment_type === "online") {
        online += amount;
        onlineDetails.push({ trip_id: trip.trip_id, amount });
      }
    });

    total = cash + online;

    res.json({
      total,
      cash,
      online,
      cashDetails,
      onlineDetails
    });
  });
};

exports.getSourceStop = (req, res) => {
  const { tripId, userId } = req.body;

  if (!tripId || !userId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const sql = "SELECT source FROM trips WHERE id = ? AND user_id = ?";
  db.query(sql, [tripId, userId], (err, results) => {
    if (err) {
      console.error("Source stop fetch error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    if (!results.length) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({ source: results[0].source });
  });
};

exports.getDestinationStop = (req, res) => {
  const { tripId, userId } = req.body;

  if (!tripId || !userId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const sql = "SELECT destination FROM trips WHERE id = ? AND user_id = ?";
  db.query(sql, [tripId, userId], (err, results) => {
    if (err) {
      console.error("Destination stop fetch error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    if (!results.length) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({ destination: results[0].destination });
  });
};

exports.getTripPaymentInfo = (req, res) => {
  const { tripId, userId } = req.body;
  console.log("mmmmmmmmmmmm")
  console.log(tripId,userId);

  if (!tripId || !userId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const sql = `
    SELECT type, payment_status, fare 
    FROM trips 
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, [tripId, userId], (err, results) => {
    if (err) {
      console.error("Payment info fetch error:", err);
      return res.status(500).json({ error: "DB error" });
    }

    if (!results.length) {
      return res.status(404).json({ error: "Trip not found" });
    }
    console.log("errrrrrrrrrr")
    console.log(results[0]);
    res.json(results[0]);
  });
};
