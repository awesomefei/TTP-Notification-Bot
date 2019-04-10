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

console.log('I am trying hard!!!!!!!!!!!!!!');
var address =
{
    channelId: 'msteams',
    user: { id: '29:1KPAAhU_d2-yh6-dDqjKPKyxIquQOvMsrhHQDQ8DlcbAalZCBHILMDXOWMolsP4cFUn0OOegOgEWXQOI2ue7meA' },
    channelData: {
        tenant: {
            id: '72f988bf-86f1-41af-91ab-2d7cd011db47'
        }
    },
    bot:
    {
        id: '28:4ee38d37-a8b8-40e8-b41e-a84fe36e6961',
        name: 'Test Bot'
    },
    serviceUrl: 'https://smba.trafficmanager.net/amer/'
}
console.log('sending**************finished');

var msg = new builder.Message().address(address);
msg.text('Hello, this is a notification');
bot.send(msg);

// Intercept trigger event (ActivityTypes.Trigger)
// bot.on('trigger', function (message) {
//     console.log('@@@@@@@@ message', message);
//     // handle message from trigger function
//     var queuedMessage = message.value;
//     var reply = new builder.Message()
//         .address(queuedMessage.address)
//         .text('This is coming from the trigger111111: ' + queuedMessage.text);
//     bot.send(reply);
// });

// Handle message from user
bot.dialog('/', function (session) {
    // console.log('!!!!!!!!!!!! session',session);
 
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
                    // console.log('!!!!!123!!!!!!!!!!!!! address.user.id is ',session.message.address.user.id, '!!!!!#########');
                    // console.log('((((((((())))))))) session.message.sourceEvent.tenant.id is ',session.message.sourceEvent.tenant.id, '!!!!!#########');
                    // console.log('____________________ address.bot.id',session.message.address.bot.id, '!!!!!#########');
                    // console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~address.serviceUr',session.message.address.serviceUrl, '!!!!!#########');
                    // Message inserted
                    //session.send('Your message (\'' + session.message.text + '\') aaaaa has been added to a queue, and it will be sent back to you via a Function');
                
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
