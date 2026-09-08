import db from "../../../config/db.js";

export const deletePayment = async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { payment_id } = req.params;

    // await connection.query(
    //   `UPDATE chit_collections_payments SET is_deleted=TRUE 
    //    WHERE id=? AND is_deleted=FALSE`,
    //   [payment_id]
    // );

    await connection.query(
      `DELETE FROM chit_collections_payments
       WHERE id=?`,
      [payment_id]
    );

    await connection.query(
      `DELETE FROM chit_payment_allocations
       WHERE payment_id=?`,
      [payment_id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Payment deleted",
    });

  } catch (err) {
    await connection.rollback();

    res.status(400).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};
