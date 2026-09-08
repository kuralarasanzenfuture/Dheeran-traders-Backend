import db from "../config/db.js";

// ✅ Check if user has permission
// export const canAccess = async (user_id, module_code, action_code) => {
//   try {
//     // ✅ 1. Validate inputs
//     if (!user_id || !module_code || !action_code) {
//       return false;
//     }

//     // ✅ 2. Get user + role
//     const [[user]] = await db.query(
//       `SELECT id, role_id FROM users_roles WHERE id = ?`,
//       [user_id]
//     );

//     if (!user) return false;

//     // ✅ 3. Get permission (single optimized query)
//     const [[result]] = await db.query(`
//       SELECT 
//         COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed
//       FROM modules m
//       JOIN module_actions ma 
//         ON ma.module_id = m.id
//       LEFT JOIN role_permissions rp 
//         ON rp.module_id = m.id 
//         AND rp.action_id = ma.id 
//         AND rp.role_id = ?
//       LEFT JOIN user_permissions up
//         ON up.module_id = m.id 
//         AND up.action_id = ma.id 
//         AND up.user_id = ?
//       WHERE m.code = ? 
//         AND ma.action_code = ?
//       LIMIT 1
//     `, [user.role_id, user_id, module_code, action_code]);

//     return result?.is_allowed === 1;

//   } catch (error) {
//     console.error("canAccess error:", error);
//     return false;
//   }
// };


// export const canAccess = async (user_id, module_code, action_code) => {
//   try {
//     if (!user_id || !module_code || !action_code) {
//       return false;
//     }

//     const [[result]] = await db.query(`
//       SELECT 
//         COALESCE(up.is_allowed, rp.is_allowed, FALSE) AS is_allowed
//       FROM users_roles u

//       JOIN role_based r ON r.id = u.role_id

//       JOIN modules m ON m.code = ?

//       JOIN module_actions ma 
//         ON ma.module_id = m.id 
//         AND ma.action_code = ?

//       LEFT JOIN role_permissions rp 
//         ON rp.role_id = r.id 
//         AND rp.module_id = m.id 
//         AND rp.action_id = ma.id

//       LEFT JOIN user_permissions up
//         ON up.user_id = u.id 
//         AND up.module_id = m.id 
//         AND up.action_id = ma.id

//       WHERE u.id = ?
//       LIMIT 1
//     `, [module_code, action_code, user_id]);

//     return result?.is_allowed === 1;

//   } catch (error) {
//     console.error("canAccess error:", error);
//     return false;
//   }
// };



//             ┌───────────────┐
//             │   Request     │
//             │ user_id = 5   │
//             │ BILLING_PRODUCTS │
//             │ CREATE        │
//             └───────┬───────┘
//                     │
//                     ▼
//         ┌──────────────────────┐
//         │ Find User            │
//         │ users_roles.id = 5   │
//         └────────┬─────────────┘
//                  │
//                  ▼
//         ┌──────────────────────┐
//         │ Get Role             │
//         │ role_id = 2 (STAFF)  │
//         └────────┬─────────────┘
//                  │
//                  ▼
//         ┌──────────────────────┐
//         │ Find Module          │
//         │ code = BILLING_PRODUCTS │
//         └────────┬─────────────┘
//                  │
//                  ▼
//         ┌──────────────────────┐
//         │ Find Action          │
//         │ CREATE               │
//         └────────┬─────────────┘
//                  │
//                  ▼
//      ┌───────────────────────────────┐
//      │ Check user_permissions        │
//      │ (user_id, module_id, action) │
//      └──────────────┬────────────────┘
//                     │
//         YES ────────┘        NO
//         │                     │
//         ▼                     ▼
//  Return user value     Check role_permissions
//                               │
//                               ▼
//                       Return role value
//                               │
//                               ▼
//                          If NULL → FALSE ❌

// 1. user_permissions  ✅ (highest priority)
// 2. role_permissions
// 3. default FALSE ❌

export const canAccess = (user, module, action) => {
  return user.permissions?.[`${module}_${action}`] === true;
};

