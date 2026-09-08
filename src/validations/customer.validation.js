import Joi from "joi";

/**
 * Validation schema for creating a new customer
 */
export const createCustomerSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).required().messages({
    "string.empty": "First name is required",
    "any.required": "First name is required",
    "string.max": "First name cannot exceed 100 characters",
  }),

  last_name: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "Last name cannot exceed 100 characters",
  }),

  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Phone number must be between 10 and 15 digits",
      "string.empty": "Phone number is required",
      "any.required": "Phone number is required",
    }),

  email: Joi.string().trim().email().max(150).allow(null, "").optional().messages({
    "string.email": "Invalid email address format",
    "string.max": "Email cannot exceed 150 characters",
  }),

  address: Joi.string().trim().max(255).allow(null, "").optional().messages({
    "string.max": "Address cannot exceed 255 characters",
  }),

  place: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "Place cannot exceed 100 characters",
  }),

  district: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "District cannot exceed 100 characters",
  }),

  state: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "State cannot exceed 100 characters",
  }),

  pincode: Joi.string()
    .trim()
    .pattern(/^[0-9]{4,10}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Pincode must be between 4 and 10 numeric digits",
    }),

  country: Joi.string().trim().max(100).default("India").allow(null, "").optional().messages({
    "string.max": "Country cannot exceed 100 characters",
  }),

  latitude: Joi.number().min(-90).max(90).allow(null).optional().messages({
    "number.min": "Latitude must be between -90 and 90",
    "number.max": "Latitude must be between -90 and 90",
  }),

  longitude: Joi.number().min(-180).max(180).allow(null).optional().messages({
    "number.min": "Longitude must be between -180 and 180",
    "number.max": "Longitude must be between -180 and 180",
  }),

  google_maps_url: Joi.string().trim().max(500).allow(null, "").optional().messages({
    "string.max": "Google Maps URL cannot exceed 500 characters",
  }),

  remarks: Joi.string().trim().max(255).allow(null, "").optional(),
});

/**
 * Validation schema for updating customer profile & address info
 * (Excludes location fields to keep profile and geo-location APIs distinct)
 */
export const updateCustomerSchema = Joi.object({
  first_name: Joi.string().trim().min(1).max(100).optional().messages({
    "string.empty": "First name cannot be empty",
    "string.max": "First name cannot exceed 100 characters",
  }),

  last_name: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "Last name cannot exceed 100 characters",
  }),

  phone: Joi.string()
    .trim()
    .pattern(/^[0-9]{10,15}$/)
    .optional()
    .messages({
      "string.pattern.base": "Phone number must be between 10 and 15 digits",
      "string.empty": "Phone number cannot be empty",
    }),

  email: Joi.string().trim().email().max(150).allow(null, "").optional().messages({
    "string.email": "Invalid email address format",
    "string.max": "Email cannot exceed 150 characters",
  }),

  address: Joi.string().trim().max(255).allow(null, "").optional().messages({
    "string.max": "Address cannot exceed 255 characters",
  }),

  place: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "Place cannot exceed 100 characters",
  }),

  district: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "District cannot exceed 100 characters",
  }),

  state: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "State cannot exceed 100 characters",
  }),

  pincode: Joi.string()
    .trim()
    .pattern(/^[0-9]{4,10}$/)
    .allow(null, "")
    .optional()
    .messages({
      "string.pattern.base": "Pincode must be between 4 and 10 numeric digits",
    }),

  country: Joi.string().trim().max(100).allow(null, "").optional().messages({
    "string.max": "Country cannot exceed 100 characters",
  }),

  remarks: Joi.string().trim().max(255).allow(null, "").optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided to update customer",
  });

/**
 * Validation schema for updating customer geo-location separately
 */
export const updateCustomerLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    "any.required": "Latitude is required",
    "number.base": "Latitude must be a valid number",
    "number.min": "Latitude must be between -90 and 90",
    "number.max": "Latitude must be between -90 and 90",
  }),

  longitude: Joi.number().min(-180).max(180).required().messages({
    "any.required": "Longitude is required",
    "number.base": "Longitude must be a valid number",
    "number.min": "Longitude must be between -180 and 180",
    "number.max": "Longitude must be between -180 and 180",
  }),

  google_maps_url: Joi.string().trim().max(500).allow(null, "").optional().messages({
    "string.max": "Google Maps URL cannot exceed 500 characters",
  }),

  remarks: Joi.string().trim().max(255).allow(null, "").optional(),
});
