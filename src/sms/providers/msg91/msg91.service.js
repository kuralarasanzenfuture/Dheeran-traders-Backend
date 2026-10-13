import { msg91Client } from "./msg91.client.js";

export const msg91Service = {
  async sendTemplateSMS({ phone, templateId, variables = {} }) {
    if (!phone) {
      throw new Error("Phone number is required");
    }

    if (!templateId) {
      throw new Error("MSG91 template ID is required");
    }

    // Format phone number (e.g. "6380564945" -> "916380564945")
    let cleanPhone = String(phone).replace(/[^\d]/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const payload = {
      template_id: templateId,
      short_url: "0",
      recipients: [
        {
          mobiles: cleanPhone,
          ...variables,
        },
      ],
    };

    try {
      const response = await msg91Client.post("/api/v5/flow/", payload);

      return {
        success: true,
        provider: "msg91",
        data: response.data,
      };
    } catch (error) {
      console.error("[MSG91 Error]:", error.response?.data || error.message);

      throw new Error(
        error.response?.data?.message || error.message || "MSG91 SMS failed",
      );
    }
  },
};

export default msg91Service;
