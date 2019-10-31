'use strict';

// ------------------------
// Bolt App Initialization
// ------------------------
const { App, ExpressReceiver } = require('@slack/bolt');
const store = require('./store');
const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: expressReceiver
});

// ------------------------
// Application Logic
// ------------------------

// app.command('/echo', async ({ command, ack, say }) => {
//   ack();
//   say(`${command.text}`);
// });
//
// app.error((error) => {
// 	// Check the details of the error to handle cases where you should retry sending a message or stop the app
// 	console.error(error);
// });

app.event('app_home_opened', ({ event, say }) => {
  // Look up the user from DB
  let user = store.getUser(event.user);

  if(!user) {
    user = {
      user: event.user,
      channel: event.channel
    };
    store.addUser(user);
    let welcome_block = [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Glad to have you as a Ghost Buster <@${event.user}>!`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Got a coworker who has ghosted you? Spook them with Ghost Buster!"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "To spook your ghost, try `/spook @coworker`"
        }
      },
      {
        "type": "context",
        "elements": [
          {
            "type": "mrkdwn",
            "text": "For more info, contact support@ghostbusterbot.io"
          }
        ]
      }
    ]
    say({ blocks: welcome_block });
  } else {
    console.log("Already here");
  }
});

app.command('/spook', async ({ command, ack, say }) => {
  // Acknowledge command request
  ack();

  const users = await app.client.users.list({
    token: process.env.SLACK_BOT_TOKEN
  })

  let desired_user_id = "";
  let desired_user_name = "";

  for (let i = 0; i < users.members.length; i++) {
    if ("@" + users.members[i].name === command.text.split(' ')[0].trim()) {
      desired_user_id = users.members[i].id;
      desired_user_name = users.members[i].name;
    }
  }

  let post_blocks = [
    {
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": `Hey Casper :ghost: :wink: <@${command.user_name}> needs you!`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "For more info, contact support@ghostbusterbot.io"
        }
      ]
    }
  ]

  const msg_result = await app.client.chat.postMessage({
    channel: desired_user_id,
    text: 'Don\'t be a ghost! ' + command.user_name + ' needs you!',
    token: process.env.SLACK_BOT_TOKEN,
    blocks: post_blocks,
    icon_emoji: ':ghost:',
    as_user: true
  })

  let spooked_block = [
    {
      "type": "section",
      "text": {
        "type": "plain_text",
        "text": `You've spooked <@${desired_user_name}>!`,
        "emoji": true
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "For more info, contact support@ghostbusterbot.io"
        }
      ]
    }
  ]

  say({ blocks: spooked_block });

});

// ------------------------
// AWS Lambda handler
// ------------------------
const awsServerlessExpress = require('aws-serverless-express');
const server = awsServerlessExpress.createServer(expressReceiver.app);
module.exports.app = (event, context) => {
  awsServerlessExpress.proxy(server, event, context);
  console.log("event: ", event);
}
