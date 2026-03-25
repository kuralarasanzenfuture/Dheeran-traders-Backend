import db from "../../config/db.js";

// /* 🔹 Create Role */
// export const createRole = async (req, res) => {
//   try {
//     let { role_name } = req.body;

//     if (!role_name) {
//       return res.status(400).json({ message: "role_name is required" });
//     }

//     // force uppercase
//     role_name = role_name.trim().toUpperCase();

//     // only A-Z and underscore allowed
//     const regex = /^[A-Z_]+$/;
//     if (!regex.test(role_name)) {
//       return res.status(400).json({
//         message: "Role name must be UPPERCASE and contain only letters and _"
//       });
//     }

//     const [exist] = await db.query(
//       "SELECT id FROM role_based WHERE role_name = ?",
//       [role_name]
//     );

//     if (exist.length > 0) {
//       return res.status(409).json({ message: "Role already exists" });
//     }

//     await db.query(
//       "INSERT INTO role_based (role_name) VALUES (?)",
//       [role_name]
//     );

//     res.status(201).json({ message: "Role created successfully" });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* 🔹 Get All Roles */
// export const getAllRoles = async (req, res) => {
//   try {
//     const [rows] = await db.query("SELECT * FROM role_based ORDER BY id DESC");
//     res.json(rows);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* 🔹 Update Role */
// export const updateRole = async (req, res) => {
//   try {
//     const { id } = req.params;
//     let { role_name } = req.body;

//     if (!role_name) {
//       return res.status(400).json({ message: "role_name is required" });
//     }

//     role_name = role_name.trim().toUpperCase();

//     const regex = /^[A-Z_]+$/;
//     if (!regex.test(role_name)) {
//       return res.status(400).json({
//         message: "Role name must be UPPERCASE and contain only letters and _"
//       });
//     }

//     const [exist] = await db.query(
//       "SELECT id FROM role_based WHERE role_name = ? AND id != ?",
//       [role_name, id]
//     );

//     if (exist.length > 0) {
//       return res.status(409).json({ message: "Role already exists" });
//     }

//     const [result] = await db.query(
//       "UPDATE role_based SET role_name = ? WHERE id = ?",
//       [role_name, id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Role not found" });
//     }

//     res.json({ message: "Role updated successfully" });

//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// /* 🔹 Delete Role */
// export const deleteRole = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const [result] = await db.query(
//       "DELETE FROM role_based WHERE id = ?",
//       [id]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: "Role not found" });
//     }

//     res.json({ message: "Role deleted successfully" });

//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

/* 🔹 Create Role */
export const createRole = async (req, res) => {
  try {
    let { role_name, role_description } = req.body;

    if (!role_name) {
      return res.status(400).json({ message: "role_name is required" });
    }

    role_name = role_name.trim().toUpperCase();

    const regex = /^[A-Z_]+$/;
    if (!regex.test(role_name)) {
      return res.status(400).json({
        message: "Role name must be contain only letters and _",
      });
    }

    if (role_name === "ADMIN") {
      return res.status(403).json({ message: "ADMIN role is system default" });
    }

    const [exist] = await db.query(
      "SELECT id FROM role_based WHERE role_name = ?",
      [role_name],
    );

    if (exist.length) {
      return res.status(409).json({ message: "Role already exists" });
    }

    await db.query(
      "INSERT INTO role_based (role_name, role_description) VALUES (?, ?)",
      [role_name, role_description],
    );

    res.status(201).json({ message: "Role created successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* 🔹 Get All Roles */
export const getAllRoles = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM role_based ORDER BY id ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* 🔹 Update Role (ADMIN protected) */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    let { role_name, role_description, status } = req.body;

    if (!role_name) {
      return res.status(400).json({ message: "role_name is required" });
    }

    role_name = role_name.trim().toUpperCase();

    if (!role_name) {
      return res.status(400).json({
        message: "role_name cannot be empty",
      });
    }

    const regex = /^[A-Z0-9_ ]+$/;
    if (!regex.test(role_name)) {
      return res.status(400).json({
        message: "Role name must contain only letters, numbers, space and _",
      });
    }

    if (status) {
      status = status.toLowerCase();

      if (status !== "active" && status !== "inactive") {
        return res.status(400).json({
          message: "status must be active or inactive",
        });
      }
    }

    if (role_description && role_description.length > 500) {
      return res.status(400).json({
        message: "role_description too long",
      });
    }

    const [[role]] = await db.query(
      "SELECT role_name, status FROM role_based WHERE id = ?",
      [id]
    );

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.role_name === "ADMIN") {
      return res.status(403).json({
        message: "ADMIN role cannot be edited",
      });
    }

    if (!status) {
      status = role.status;
    }

    const [exist] = await db.query(
      "SELECT id FROM role_based WHERE role_name = ? AND id != ?",
      [role_name, id]
    );

    if (exist.length) {
      return res.status(409).json({ message: "Role already exists" });
    }

    await db.query(
      `UPDATE role_based 
       SET role_name = ?, role_description = ?, status = ?
       WHERE id = ?`,
      [role_name, role_description, status, id]
    );

    res.json({ message: "Role updated successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* 🔹 Delete Role (ADMIN protected) */
export const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const [[role]] = await db.query(
      "SELECT role_name FROM role_based WHERE id = ?",
      [id],
    );

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    if (role.role_name === "ADMIN") {
      return res.status(403).json({ message: "ADMIN role cannot be deleted" });
    }

    await db.query("DELETE FROM role_based WHERE id = ?", [id]);

    res.json({ message: "Role deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateRoleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    let { status } = req.body;

    // 🔴 Required validation
    if (!status) {
      return res.status(400).json({
        message: "status is required",
      });
    }

    status = status.toLowerCase().trim();

    // 🔴 Strict validation
    const allowedStatus = ["active", "inactive"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "status must be active or inactive",
      });
    }

    // 🔍 Get role
    const [[role]] = await db.query(
      "SELECT id, role_name, status FROM role_based WHERE id = ?",
      [id]
    );

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    // 🔴 Protect system role
    if (role.role_name === "ADMIN") {
      return res.status(403).json({
        message: "ADMIN role status cannot be changed",
      });
    }

    // ⚠️ Prevent unnecessary DB hit
    if (role.status === status) {
      return res.status(200).json({
        message: `Role already ${status}`,
      });
    }

    // ✅ Update
    await db.query(
      "UPDATE role_based SET status = ? WHERE id = ?",
      [status, id]
    );

    res.json({
      message: `Role ${status} successfully`,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Server error",
    });
  }
};
