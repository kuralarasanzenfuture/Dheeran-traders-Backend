import axios from "axios";

const token =
  "EAAeDSBa8sf0BRiEQDDXU6oZCxzZBiD7zkRqyJwBZAJ80JNYaJgf3vm6GDpUeeZBO9B8jzhxfORUq7xu3s4KanL5aHtUoYj4F1ZBbr69LQUgf5ZA2uCS9W2ZCEz0Q2FeAvrTJv9p3cmxw5hCQglrwMyjVPn4DyZCnQPBLx0eu738xuXbUsdGfoVs0SdPgL4jYIvFBe3D4ydU9OTZBjhqW6KNaxfSFhow0hZA6nfJDZCaDzv7UqH3mkHyKF7IfZBL4nAN6EJoiODSoiOk7RxXCAE8GvsEvZCOzk";
const phoneNumberId = "1123289120872293";

async function sendTemplate() {

  try {

    const response = await axios.post(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: "916380564945",
        type: "template",
        template: {
          name: "hello_world have fun",
          language: {
            code: "en_US"
          }
        }
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(response.data);

  } catch (error) {

    console.log(error.response?.data || error.message);
  }
}

sendTemplate();
