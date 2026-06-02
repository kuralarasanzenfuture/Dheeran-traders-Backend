import axios from "axios";

export const sendSMS = async ({
  phone,
  message,
}) => {

  try {

    const response = await axios.post(
      "https://www.fast2sms.com/dev/bulkV2",
      {
        route: "q",

        message,

        language: "english",

        flash: 0,

        numbers: phone,
      },
      {
        headers: {
          authorization:
            process.env.FAST2SMS_API_KEY,
          "Content-Type":
            "application/json",
        },
      }
    );

    console.log(response.data);

  } catch (error) {

    console.log(error.response?.data);
  }
};