/*-----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework.
-----------------------------------------------------------------------------*/

var restify = require('restify');
var builder = require('botbuilder');
var azure = require('azure-storage');
var botbuilder_azure = require("botbuilder-azure");

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

/*----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot.
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */

var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);
var queueName = process.env.BotQueueName || 'bot-queue';

// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);


// let newAddress = {
//     channelId: "msteams",
//     user: { id: session.message.address.user.id },
//     channelData: {
//         tenant: {
//             id: session.message.sourceEvent.tenant.id,
//         },
//     },
//     bot: {
//         id: session.message.address.bot.id,
//         // The bot's name can be used, but is not necessary
//         // name: session.message.address.bot.name,
//     },
//     serviceUrl: msgServiceUrl,
//     useAuth: true,
// };

// Intercept trigger event (ActivityTypes.Trigger)
bot.on('trigger', function (message) {
    console.log('@@@@@@@@ message', message);
    // handle message from trigger function
    var queuedMessage = message.value;
    var reply = new builder.Message()
        .address(queuedMessage.address)
        .text('This is coming from the trigger111111: ' + queuedMessage.text);
    bot.send(reply);
});

// Handle message from user
bot.dialog('/', function (session) {
    // console.log('!!!!!!!!!!!! session',session);
    console.log('!!!!!!!!!!!!!!!!!!!!! address.user.id',session.message.address.user.id, '!!!!!#########');
    console.log('((((((((())))))))) tenant.id',session.message.sourceEvent.tenant.id, '!!!!!#########');
    console.log('____________________ address.bot.id',ession.message.address.bot.id, '!!!!!#########');
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~address.serviceUr',session.message.address.serviceUrl, '!!!!!#########');
    var queuedMessage = { address: session.message.address, text: session.message.text };
    // add message to queue
    session.sendTyping();
    var queueSvc = azure.createQueueService(process.env.AzureWebJobsStorage);
    queueSvc.createQueueIfNotExists(queueName, function(err, result, response){
        if(!err){
            // Add the message to the queue
            var queueMessageBuffer = new Buffer(JSON.stringify(queuedMessage)).toString('base64');
            queueSvc.createMessage(queueName, queueMessageBuffer, function(err, result, response){
                if(!err){
                    // Message inserted
                    //session.send('Your message (\'' + session.message.text + '\') aaaaa has been added to a queue, and it will be sent back to you via a Function');
                    var address =
                        {
                            channelId: 'msteams',
                            user: { id: session.message.user.id },
                            channelData: {
                                tenant: {
                                    id: session.message.sourceEvent.tenant.id
                                }
                            },
                            bot:
                            {
                                id: config.get("bot.appId"),
                                name: 'Test Bot'
                            },
                            serviceUrl: session.message.address.serviceUrl
                        }

                        var msg = new builder.Message().address(address);
                        msg.text('Hello, this is a notification');
                        bot.send(msg);
                } else {
                    // this should be a log for the dev, not a message to the user
                    session.send('There was an error inserting your message into queue');
                }
            });
        } else {
            // this should be a log for the dev, not a message to the user
            session.send('There was an error creating your queue');
        }
    });

});
