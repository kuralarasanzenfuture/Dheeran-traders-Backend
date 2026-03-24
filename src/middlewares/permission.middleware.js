import { canAccess } from "../utils/permission.js";

export const checkPermission = (module_code, action_code) => {
  return async (req, res, next) => {
    try {
      const user_id = req.user?.id; // from auth middleware

      if (!user_id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const allowed = await canAccess(user_id, module_code, action_code);

      if (!allowed) {
        return res.status(403).json({
          message: "Access denied"
        });
      }

      next();

    } catch (error) {
      console.error("Permission middleware error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
};