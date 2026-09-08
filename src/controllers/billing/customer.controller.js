import db from "../../config/db.js";
import { AuditLog } from "../../services/audit.service.js";

/**
 * ============================================================================
 * CREATE CUSTOMER
 * POST /api/customers
 * ============================================================================
 */
export const createCustomer = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const userId = req.user?.id;
    if (!userId) {
      await connection.rollback();
      return res.status(401).json({ message: "User not authenticated" });
    }

    let {
      first_name,
      last_name,
      phone,
      email,
      address,
      place,
      district,
      state,
      pincode,
      country = "India",
      latitude,
      longitude,
      google_maps_url,
      remarks,
    } = req.body;

    // Required validation
    if (!first_name || !phone) {
      await connection.rollback();
      return res.status(400).json({
        message: "First name and phone number are required",
      });
    }

    // Sanitize string inputs
    first_name = first_name.trim();
    last_name = last_name?.trim() || null;
    phone = phone.trim();
    email = email?.trim() || null;
    address = address?.trim() || null;
    place = place?.trim() || null;
    district = district?.trim() || null;
    state = state?.trim() || null;
    pincode = pincode?.trim() || null;
    country = country?.trim() || "India";

    // Phone format validation
    if (!/^[0-9]{10,15}$/.test(phone)) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid phone number format (10-15 digits)" });
    }

    // Email format validation
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check duplicate phone
    const [phoneExists] = await connection.query(
      "SELECT id FROM customers WHERE phone = ?",
      [phone]
    );
    if (phoneExists.length) {
      await connection.rollback();
      return res.status(409).json({
        message: `Customer with phone number '${phone}' already exists`,
      });
    }

    // Check duplicate email (if provided)
    if (email) {
      const [emailExists] = await connection.query(
        "SELECT id FROM customers WHERE email = ?",
        [email]
      );
      if (emailExists.length) {
        await connection.rollback();
        return res.status(409).json({
          message: `Customer with email '${email}' already exists`,
        });
      }
    }

    // Handle Geo-Location coordinates & map link
    const hasCoordinates =
      latitude !== undefined &&
      latitude !== null &&
      longitude !== undefined &&
      longitude !== null;

    let parsedLat = null;
    let parsedLng = null;
    let locationUpdatedAt = null;

    if (hasCoordinates) {
      parsedLat = parseFloat(latitude);
      parsedLng = parseFloat(longitude);

      if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
        await connection.rollback();
        return res.status(400).json({ message: "Latitude must be a valid number between -90 and 90" });
      }

      if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
        await connection.rollback();
        return res.status(400).json({ message: "Longitude must be a valid number between -180 and 180" });
      }

      locationUpdatedAt = new Date();
      if (!google_maps_url || !google_maps_url.trim()) {
        google_maps_url = `https://www.google.com/maps?q=${parsedLat},${parsedLng}`;
      } else {
        google_maps_url = google_maps_url.trim();
      }
    } else {
      google_maps_url = google_maps_url?.trim() || null;
    }

    // Insert customer record
    const [result] = await connection.query(
      `INSERT INTO customers (
        first_name,
        last_name,
        phone,
        email,
        address,
        place,
        district,
        state,
        pincode,
        country,
        latitude,
        longitude,
        google_maps_url,
        location_updated_at,
        created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name,
        last_name,
        phone,
        email,
        address,
        place,
        district,
        state,
        pincode,
        country,
        parsedLat,
        parsedLng,
        google_maps_url,
        locationUpdatedAt,
        userId,
      ]
    );

    const customerId = result.insertId;

    // Fetch newly created record
    const [[newCustomer]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [customerId]
    );

    // Audit Log entry
    await AuditLog({
      connection,
      table: "customers",
      recordId: customerId,
      action: "INSERT",
      newData: newCustomer,
      userId,
      remarks: remarks || "Customer created",
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Customer created successfully",
      id: customerId,
      customer: newCustomer,
    });
  } catch (err) {
    await connection.rollback();
    console.error("CREATE CUSTOMER ERROR:", err);
    return res.status(500).json({
      message: err.message || "Error creating customer",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * GET ALL CUSTOMERS
 * GET /api/customers
 * ============================================================================
 */
export const getCustomers = async (req, res) => {
  try {
    const { search, place, district } = req.query;

    let query = `
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.address,
        c.place,
        c.district,
        c.state,
        c.pincode,
        c.country,
        c.latitude,
        c.longitude,
        c.google_maps_url,
        c.location_updated_at,
        c.created_by,
        c.updated_by,
        c.created_at,
        c.updated_at,

        creator.username AS created_by_name,
        updater.username AS updated_by_name,

        COALESCE(SUM(cb.grand_total), 0) AS total,
        COALESCE(SUM(cb.balance_due), 0) AS pending_amount

      FROM customers c
      LEFT JOIN users_roles creator ON c.created_by = creator.id
      LEFT JOIN users_roles updater ON c.updated_by = updater.id
      LEFT JOIN customerBilling cb ON c.id = cb.customer_id
    `;

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`(
        c.first_name LIKE ? OR
        c.last_name LIKE ? OR
        c.phone LIKE ? OR
        c.email LIKE ? OR
        c.place LIKE ? OR
        c.district LIKE ?
      )`);
      const searchPattern = `%${search.trim()}%`;
      params.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    if (place) {
      conditions.push("c.place = ?");
      params.push(place.trim());
    }

    if (district) {
      conditions.push("c.district = ?");
      params.push(district.trim());
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += `
      GROUP BY c.id
      ORDER BY c.id DESC
    `;

    const [rows] = await db.query(query, params);

    return res.json(rows);
  } catch (error) {
    console.error("GET CUSTOMERS ERROR:", error);
    return res.status(500).json({ message: "Server error fetching customers" });
  }
};

/**
 * ============================================================================
 * GET CUSTOMER BY ID
 * GET /api/customers/:id
 * ============================================================================
 */
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const [[customer]] = await db.query(
      `
      SELECT
        c.*,
        creator.username AS created_by_name,
        updater.username AS updated_by_name,
        COALESCE(SUM(cb.grand_total), 0) AS total,
        COALESCE(SUM(cb.balance_due), 0) AS pending_amount
      FROM customers c
      LEFT JOIN users_roles creator ON c.created_by = creator.id
      LEFT JOIN users_roles updater ON c.updated_by = updater.id
      LEFT JOIN customerBilling cb ON c.id = cb.customer_id
      WHERE c.id = ?
      GROUP BY c.id
      `,
      [id]
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    return res.json(customer);
  } catch (error) {
    console.error("GET CUSTOMER BY ID ERROR:", error);
    return res.status(500).json({ message: "Server error fetching customer" });
  }
};

/**
 * ============================================================================
 * UPDATE CUSTOMER (Personal / Contact / Address Details)
 * PUT/PATCH /api/customers/:id
 * ============================================================================
 */
export const updateCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    const { remarks } = req.body;

    if (isNaN(id)) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    if (!userId) {
      await connection.rollback();
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Get existing record
    const [[oldData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );

    if (!oldData) {
      await connection.rollback();
      return res.status(404).json({ message: "Customer not found" });
    }

    // Allowed customer profile & address fields
    const allowedFields = [
      "first_name",
      "last_name",
      "phone",
      "email",
      "address",
      "place",
      "district",
      "state",
      "pincode",
      "country",
      "latitude",
      "longitude",
      "google_maps_url",
    ];

    let data = {};

    for (let key of allowedFields) {
      if (req.body[key] !== undefined) {
        data[key] = req.body[key];
      }
    }

    // Normalize & trim strings
    for (let key in data) {
      if (typeof data[key] === "string") {
        data[key] = data[key].trim();
        // Allow empty string to set null for nullable fields
        if (data[key] === "" && key !== "first_name" && key !== "phone") {
          data[key] = null;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "No valid fields provided to update" });
    }

    // Validation
    if (data.first_name !== undefined && (!data.first_name || data.first_name === "")) {
      await connection.rollback();
      return res.status(400).json({ message: "First name cannot be empty" });
    }

    if (data.phone) {
      if (!/^[0-9]{10,15}$/.test(data.phone)) {
        await connection.rollback();
        return res.status(400).json({ message: "Invalid phone number format (10-15 digits)" });
      }

      const [phoneExists] = await connection.query(
        "SELECT id FROM customers WHERE phone = ? AND id != ?",
        [data.phone, id]
      );
      if (phoneExists.length) {
        await connection.rollback();
        return res.status(409).json({ message: `Phone number '${data.phone}' already in use` });
      }
    }

    if (data.email) {
      if (!/^\S+@\S+\.\S+$/.test(data.email)) {
        await connection.rollback();
        return res.status(400).json({ message: "Invalid email format" });
      }

      const [emailExists] = await connection.query(
        "SELECT id FROM customers WHERE email = ? AND id != ?",
        [data.email, id]
      );
      if (emailExists.length) {
        await connection.rollback();
        return res.status(409).json({ message: `Email '${data.email}' already in use` });
      }
    }

    // Check for actual changes
    let isChanged = false;
    for (let key in data) {
      if (String(data[key] ?? "") !== String(oldData[key] ?? "")) {
        isChanged = true;
        break;
      }
    }

    if (!isChanged) {
      await connection.rollback();
      return res.json({
        success: true,
        message: "No changes detected",
        customer: oldData,
        data: oldData,
      });
    }

    // Handle coordinates update if passed
    if (data.latitude !== undefined && data.latitude !== null && data.longitude !== undefined && data.longitude !== null) {
      const parsedLat = parseFloat(data.latitude);
      const parsedLng = parseFloat(data.longitude);
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        data.latitude = parsedLat;
        data.longitude = parsedLng;
        data.location_updated_at = new Date();
        if (!data.google_maps_url || !data.google_maps_url.trim()) {
          data.google_maps_url = `https://www.google.com/maps?q=${parsedLat},${parsedLng}`;
        }
      }
    }

    // Attach updater audit
    data.updated_by = userId;

    await connection.query("UPDATE customers SET ? WHERE id = ?", [data, id]);

    const [[newData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );

    // Audit Log entry
    await AuditLog({
      connection,
      table: "customers",
      recordId: id,
      action: "UPDATE",
      oldData,
      newData,
      userId,
      remarks: remarks || "Customer details updated",
    });

    await connection.commit();

    return res.json({
      success: true,
      message: "Customer updated successfully",
      customer: newData,
      data: newData,
    });
  } catch (err) {
    await connection.rollback();
    console.error("UPDATE CUSTOMER ERROR:", err);
    return res.status(500).json({
      message: err.message || "Error updating customer",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * UPDATE CUSTOMER GEO-LOCATION (Separate Dedicated API)
 * PATCH/PUT /api/customers/:id/location
 * ============================================================================
 */
export const updateCustomerLocation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    let { latitude, longitude, google_maps_url, remarks } = req.body;

    if (isNaN(id)) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    if (!userId) {
      await connection.rollback();
      return res.status(401).json({ message: "User not authenticated" });
    }

    // Coordinates required for location update
    if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
      await connection.rollback();
      return res.status(400).json({
        message: "Both latitude and longitude are required to update customer location",
      });
    }

    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      await connection.rollback();
      return res.status(400).json({ message: "Latitude must be a valid number between -90 and 90" });
    }

    if (isNaN(parsedLng) || parsedLng < -180 || parsedLng > 180) {
      await connection.rollback();
      return res.status(400).json({ message: "Longitude must be a valid number between -180 and 180" });
    }

    // Auto-generate Google Maps URL if not provided
    if (!google_maps_url || !google_maps_url.trim()) {
      google_maps_url = `https://www.google.com/maps?q=${parsedLat},${parsedLng}`;
    } else {
      google_maps_url = google_maps_url.trim();
    }

    // Verify customer exists
    const [[oldData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );

    if (!oldData) {
      await connection.rollback();
      return res.status(404).json({ message: "Customer not found" });
    }

    const locationData = {
      latitude: parsedLat,
      longitude: parsedLng,
      google_maps_url,
      location_updated_at: new Date(),
      updated_by: userId,
    };

    await connection.query("UPDATE customers SET ? WHERE id = ?", [
      locationData,
      id,
    ]);

    const [[newData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );

    // Audit Log for location update
    await AuditLog({
      connection,
      table: "customers",
      recordId: id,
      action: "UPDATE",
      oldData: {
        latitude: oldData.latitude,
        longitude: oldData.longitude,
        google_maps_url: oldData.google_maps_url,
        location_updated_at: oldData.location_updated_at,
      },
      newData: {
        latitude: parsedLat,
        longitude: parsedLng,
        google_maps_url,
        location_updated_at: locationData.location_updated_at,
      },
      userId,
      remarks: remarks || "Customer location updated",
    });

    await connection.commit();

    return res.json({
      success: true,
      message: "Customer location updated successfully",
      location: {
        latitude: newData.latitude,
        longitude: newData.longitude,
        google_maps_url: newData.google_maps_url,
        location_updated_at: newData.location_updated_at,
      },
      customer: newData,
      data: newData,
    });
  } catch (err) {
    await connection.rollback();
    console.error("UPDATE CUSTOMER LOCATION ERROR:", err);
    return res.status(500).json({
      message: err.message || "Error updating customer location",
    });
  } finally {
    connection.release();
  }
};

/**
 * ============================================================================
 * DELETE CUSTOMER
 * DELETE /api/customers/:id
 * ============================================================================
 */
export const deleteCustomer = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const userId = req.user?.id;
    const { remarks } = req.body || {};

    if (isNaN(id)) {
      await connection.rollback();
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const [[oldData]] = await connection.query(
      "SELECT * FROM customers WHERE id = ?",
      [id]
    );

    if (!oldData) {
      await connection.rollback();
      return res.status(404).json({ message: "Customer not found" });
    }

    // Safety check: Prevent delete if customer has billing records
    const [[hasBilling]] = await connection.query(
      "SELECT COUNT(*) as count FROM customerBilling WHERE customer_id = ?",
      [id]
    );

    if (hasBilling.count > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "Cannot delete customer with existing billing records",
      });
    }

    // Safety check: Prevent delete if customer has assigned bills
    const [[hasAssignedBills]] = await connection.query(
      "SELECT COUNT(*) as count FROM assigned_bill_customers WHERE customer_id = ?",
      [id]
    ).catch(() => [[{ count: 0 }]]); // Handle table if not present

    if (hasAssignedBills?.count > 0) {
      await connection.rollback();
      return res.status(400).json({
        message: "Cannot delete customer with assigned billing records",
      });
    }

    // Audit Log before deletion
    await AuditLog({
      connection,
      table: "customers",
      recordId: id,
      action: "DELETE",
      oldData,
      userId,
      remarks: remarks || "Customer deleted",
    });

    // Delete customer
    await connection.query("DELETE FROM customers WHERE id = ?", [id]);

    await connection.commit();

    return res.json({
      success: true,
      message: "Customer permanently deleted",
    });
  } catch (err) {
    await connection.rollback();
    console.error("DELETE CUSTOMER ERROR:", err);
    return res.status(500).json({
      message: err.message || "Error deleting customer",
    });
  } finally {
    connection.release();
  }
};
