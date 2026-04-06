// import { canAccess } from "../utils/permission.js";

// export const checkPermission = (module_code, action_code) => {
//   return async (req, res, next) => {
//     try {
//       const user_id = req.user?.id; // from auth middleware

//       if (!user_id) {
//         return res.status(401).json({ message: "Unauthorized" });
//       }

//       const allowed = await canAccess(user_id, module_code, action_code);

//       if (!allowed) {
//         return res.status(403).json({
//           message: "Access denied"
//         });
//       }

//       next();

//     } catch (error) {
//       console.error("Permission middleware error:", error);
//       res.status(500).json({ message: "Server error" });
//     }
//   };
// };
// --------------------------------------------------------------------

export const checkPermission = (moduleCode, actionCode) => {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 🔥 Single optimized query
      const [rows] = await db.query(`
        SELECT 
          COALESCE(up.is_allowed, rp.is_allowed, 0) AS allowed
        FROM users_roles u
        JOIN modules m ON m.code = ?
        JOIN module_actions ma 
          ON ma.module_id = m.id AND ma.action_code = ?
        LEFT JOIN user_permissions up 
          ON up.user_id = u.id 
          AND up.module_id = m.id 
          AND up.action_id = ma.id
        LEFT JOIN role_permissions rp 
          ON rp.role_id = u.role_id 
          AND rp.module_id = m.id 
          AND rp.action_id = ma.id
        WHERE u.id = ?
        LIMIT 1
      `, [moduleCode, actionCode, user_id]);

      if (!rows.length || rows[0].allowed !== 1) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();

    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Permission check failed" });
    }
  };
};
// router.post(
//   "/products",
//   checkPermission("BILLING_PRODUCTS", "CREATE"),
//   createProduct
// );

// router.get(
//   "/products",
//   checkPermission("BILLING_PRODUCTS", "VIEW"),
//   getProducts
// );


import { canAccess } from "../../utils/permission.js";

const methodToAction = {
  GET: "VIEW",
  POST: "CREATE",
  PUT: "EDIT",
  PATCH: "EDIT",
  DELETE: "DELETE",
};

export const autoCheckPermission = () => {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.id;

      if (!user_id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // ✅ Action from HTTP method
      const action_code = methodToAction[req.method];

      // ✅ Module from route
      // Example: /api/billing/products → BILLING_PRODUCTS
      const base = req.baseUrl.split("/").filter(Boolean); // ["api", "billing"]
      const path = req.path.split("/").filter(Boolean); // ["products"]

      const module_code = `${base[1]?.toUpperCase()}_${path[0]?.toUpperCase()}`;

      // ✅ Check access
      const allowed = await canAccess(user_id, module_code, action_code);

      // ✅ Debug
      console.log({
        user_id,
        module_code,
        action_code,
      });

      if (!allowed) {
        return res.status(403).json({
          message: `Access denied: ${module_code} - ${action_code}`,
        });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
};

// COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed

// | user_permissions | role_permissions | Result |
// | ---------------- | ---------------- | ------ |
// | TRUE             | FALSE            | TRUE   |
// | NULL             | TRUE             | TRUE   |
// | NULL             | NULL             | FALSE  |

// FINAL MIDDLEWARE

// export const checkPermission = (module, action) => {
//   return (req, res, next) => {

//     const allowed = req.user.permissions?.[`${module}_${action}`];

//     if (!allowed) {
//       return res.status(403).json({ message: "Access denied" });
//     }

//     next();
//   };
// };


// | Feature            | Before             | After     |
// | ------------------ | ------------------ | --------- |
// | Permission check   | DB every request ❌ | Memory ⚡  |
// | Speed              | Slow               | Very fast |
// | Scalability        | ❌                  | ✅         |
// | Clean architecture | ❌                  | ✅         |


