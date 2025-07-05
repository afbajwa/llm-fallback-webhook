
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/', async (req, res) => {
  const userQuery = req.body.fulfillmentInfo?.tag === 'fallback'
    ? req.body.text || req.body.queryInput?.text?.text
    : null;

  if (!userQuery) {
    return res.status(200).send({
      fulfillment_response: {
        messages: [{ text: { text: ["I'm not sure how to help with that."] } }]
      }
    });
  }

  try {
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: userQuery }],
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
});

app.get('/', (req, res) => {
  res.send('LLM Fallback Webhook is running.');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
