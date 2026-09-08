import Joi from "joi";

export const createEmployeeSchema = Joi.object({
  user_id: Joi.number().integer().required(),

  employee_name: Joi.string().min(3).required(),

  email: Joi.string().email().optional().allow(null, ""),

  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required(),

  date_of_birth: Joi.date().optional().allow(null),

  gender: Joi.string()
    .valid("male", "female", "other")
    .optional()
    .allow(null),

  address: Joi.string().optional().allow(null, ""),

  aadhar_number: Joi.string()
    .pattern(/^[0-9]{12}$/)
    .optional()
    .allow(null, ""),

  pan_number: Joi.string()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional()
    .allow(null, ""),

  bank_name: Joi.string().optional().allow(null, ""),

  bank_account_number: Joi.string().optional().allow(null, ""),

  ifsc_code: Joi.string()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional()
    .allow(null, ""),

  emergency_contact_name: Joi.string().optional().allow(null, ""),

  emergency_contact_phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional()
    .allow(null, ""),

  emergency_contact_relation: Joi.string().optional().allow(null, ""),
});


export const updateEmployeeSchema = Joi.object({
  employee_name: Joi.string().min(3).optional(),

  email: Joi.string().email().optional().allow(null, ""),

  phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),

  date_of_birth: Joi.date().optional().allow(null),

  gender: Joi.string().valid("male", "female", "other").optional(),

  address: Joi.string().optional().allow(null, ""),

  aadhar_number: Joi.string()
    .pattern(/^[0-9]{12}$/)
    .optional()
    .allow(null, ""),

  pan_number: Joi.string()
    .pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional()
    .allow(null, ""),

  bank_name: Joi.string().optional().allow(null, ""),

  bank_account_number: Joi.string().optional().allow(null, ""),

  ifsc_code: Joi.string()
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional()
    .allow(null, ""),

  emergency_contact_name: Joi.string().optional().allow(null, ""),

  emergency_contact_phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .optional()
    .allow(null, ""),

  emergency_contact_relation: Joi.string().optional().allow(null, ""),
});

