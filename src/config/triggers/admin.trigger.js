export const createAdminTriggers = async (db) => {

  await db.query(`
    DROP TRIGGER IF EXISTS before_insert_admin;
  `);

  await db.query(`
    CREATE TRIGGER before_insert_admin
    BEFORE INSERT ON users_roles
    FOR EACH ROW
    BEGIN
      DECLARE admin_role_id INT;

      SELECT id INTO admin_role_id 
      FROM role_based 
      WHERE UPPER(role_name) = 'ADMIN' 
      LIMIT 1;

      IF NEW.role_id = admin_role_id THEN
        IF (SELECT COUNT(*) FROM users_roles WHERE role_id = admin_role_id) > 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Only one ADMIN allowed';
        END IF;
      END IF;
    END;
  `);

  await db.query(`
    DROP TRIGGER IF EXISTS before_update_admin;
  `);

  await db.query(`
    CREATE TRIGGER before_update_admin
    BEFORE UPDATE ON users_roles
    FOR EACH ROW
    BEGIN
      DECLARE admin_role_id INT;

      SELECT id INTO admin_role_id 
      FROM role_based 
      WHERE UPPER(role_name) = 'ADMIN' 
      LIMIT 1;

      IF NEW.role_id = admin_role_id AND OLD.role_id != admin_role_id THEN
        IF (SELECT COUNT(*) FROM users_roles WHERE role_id = admin_role_id) > 0 THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Only one ADMIN allowed';
        END IF;
      END IF;

      IF OLD.role_id = admin_role_id AND NEW.role_id != admin_role_id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot change ADMIN role';
      END IF;

      IF OLD.role_id = admin_role_id AND NEW.status = 'inactive' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot deactivate ADMIN';
      END IF;

    END;
  `);

};