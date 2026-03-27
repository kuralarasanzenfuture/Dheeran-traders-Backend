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

import { canAccess } from "../utils/permission.js";

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


