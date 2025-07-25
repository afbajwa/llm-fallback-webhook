
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/', async (req, res) => {
  const tag = req.body.fulfillmentInfo?.tag;
  const sessionParams = req.body.sessionInfo?.parameters;

  if (tag === 'fallback') {
    const userQuery = req.body.text || req.body.queryInput?.text?.text;

    if (!userQuery) {
      return res.status(200).send({
        fulfillment_response: {
          messages: [{ text: { text: ["I'm not sure how to help with that."] } }]
        }
      });
    }

    const systemPrompt = "You are a professional and friendly virtual receptionist for a clinic or law office. Your job is to answer questions clearly and help callers feel confident and cared for. If someone asks about office hours, location, services, or booking, provide direct and polite answers. If the question is complex or unclear, let them know you’ll connect them to a human. Keep responses concise, calm, and helpful.";

    try {
      const openaiResponse = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const botReply = openaiResponse.data.choices[0].message.content;

      return res.status(200).send({
        fulfillment_response: {
          messages: [{ text: { text: [botReply] } }]
        }
      });
    } catch (error) {
      console.error('OpenAI Error:', error.message);
      return res.status(500).send({
        fulfillment_response: {
          messages: [{ text: { text: ["Sorry, I had trouble understanding that."] } }]
        }
      });
    }

  } else if (sessionParams?.name && sessionParams?.datetime) {
    const name = sessionParams.name;
    const datetime = new Date(sessionParams.datetime);
    const isoDatetime = datetime.toISOString();

    console.log("Sending to Zapier:", { name, datetime: isoDatetime });

    // Send to Zapier directly
    try {
      await axios.post(process.env.ZAPIER_WEBHOOK_URL, {
        name,
        datetime: isoDatetime
      });

      return res.status(200).send({
        fulfillment_response: {
          messages: [{ text: { text: ["Thanks! I've sent your appointment request."] } }]
        }
      });
    } catch (err) {
      console.error("Zapier webhook failed:", err.message);
      return res.status(200).send({
        fulfillment_response: {
          messages: [{ text: { text: ["I couldn't send the appointment request. Please try again."] } }]
        }
      });
    }

  } else {
    return res.status(200).send({
      fulfillment_response: {
        messages: [{ text: { text: ["I need both name and date/time to schedule your appointment."] } }]
      }
    });
  }
});

app.get('/', (req, res) => {
  res.send('LLM Fallback & Booking Webhook is running.');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
