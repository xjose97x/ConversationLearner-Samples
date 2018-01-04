import * as BB from 'botbuilder-core';
import * as Models from 'blis-models'
import { BotFrameworkAdapter } from 'botbuilder-services';
import { Blis, IBlisOptions, ClientMemoryManager } from 'blis-sdk';
import * as restify from 'restify';
import { PredictedEntity } from 'blis-models';

// Demos
const inStockDemo = require('./demos/inStock');
const businessHoursDemo = require('./demos/businessHours');

// Create server
let server = restify.createServer();
server.listen(process.env.port || 3978, () => {
    console.log(`${server.name} listening to ${server.url}`);
});

// Create connector
const connector = new BotFrameworkAdapter({ appId: process.env.MICROSOFT_APP_ID, appPassword: process.env.MICROSOFT_APP_PASSWORD });
server.post('/api/messages', connector.listen() as any);

//=======================================================
// Local debug setup
//=======================================================
var fs = require('fs');
var path = require('path');

function BlisOptions() : IBlisOptions {

    var filePath = path.join(__dirname, 'blisconfig.json');
    if (fs.existsSync(filePath))
    {
        var data = fs.readFileSync(filePath, {encoding: 'utf-8'});
        var config = JSON.parse(data);

        var serviceUrl =config.BLIS_DEBUG ? config.BLIS_DEBUG_URI : config.BLIS_SERVICE_URI;
        return {   
            serviceUri: serviceUrl,  
            appId: config.BLIS_APP_ID,
            azureFunctionsUrl : config.BLIS_FUNCTIONS_URL,
            redisServer: config.BLIS_REDIS_SERVER,
            redisKey: config.BLIS_REDIS_KEY,
            localhost: true,
            user: "temp", //LARSTODO
            secret: "blah" //LARSTODO
        } 
    }
    else {
        return {   
            serviceUri: process.env.BLIS_SERVICE_URI, 
            appId: process.env.BLIS_APP_ID, 
            azureFunctionsUrl : process.env.BLIS_FUNCTIONS_URL,
            redisServer: process.env.BLIS_REDIS_SERVER,
            redisKey: process.env.BLIS_REDIS_KEY,
            localhost: false,
            user: "temp", //LARSTODO
            secret: "blah" //LARSTODO
        } 
    }
}

//=========================================================
// Bots Dialogs
//=========================================================
Blis.Init(BlisOptions());

/**
* Allows developer to alter the output text from BLIS before it is sent to the end user 
* @param {string} text Output from BLIS
* @param {ClientMemoryManager} memoryManager memory manager
* @returns {string | builder.Message} 
*/
Blis.BlisCallback(async (text: string, memoryManager: ClientMemoryManager) : Promise<string> =>
{
    // Call default callback to get bot output
    let defaultOutput = await Blis.DefaultBlisCallback(text, memoryManager);
/*LARSTEMP
    let appName = await memoryManager.AppNameAsync();
    switch (appName)
    { 
        case "Pictures":
            return picturesDemo.BlisCallback(defaultOutput, memoryManager);
    }*/
    return defaultOutput;
}
)

/**
* Processes messages received from the user. Called by the dialog system. 
* @param {string} text Input Text To BLIS
* @param {PredictedEntity[]} predictedEntities Entities extracted by LUIS model
* @param {ClientMemoryManager} memoryManager memory manager
* @returns {Promise<ScoreInput>}
*/
Blis.LuisCallback(async (text: string, predictedEntities: PredictedEntity[], memoryManager: ClientMemoryManager) : Promise<Models.ScoreInput> =>
{
    // Call default callback to update Memory with LUIS predictions
    let defaultInput = await Blis.DefaultLuisCallback(text, predictedEntities, memoryManager);
     
    let appName = await memoryManager.AppNameAsync();
    switch (appName)
    { 
        case "InStock":
            return await inStockDemo.LuisCallback(defaultInput, memoryManager);
        case "OpenClosed":
            return await businessHoursDemo.LuisCallback(defaultInput, memoryManager);
    }
    return defaultInput;
}
)

// Example of a BLIS API callback
Blis.AddAPICallback("SampleMultiply", async (memoryManager : ClientMemoryManager, number1: string, number2: string) =>
    {
        try {
            var num1 = parseInt(number1);
            var num2 = parseInt(number2);

            return `${num1 * num2}`;
        }
        catch (err)
        {
            return "Invalid number";
        }
    }
)

/*LARSTODO
// Example of a prompt
Blis.AddAPICallback("SamplePrompt", async (memoryManager: ClientMemoryManager, argArray : any[]) : Promise<string> => 
    {
        var text = argArray[0];
        var button1 = argArray[1];
        var button2 = argArray[2];

        var buttons = [
            builder.CardAction.imBack(null, button1, button1),
            builder.CardAction.imBack(null, button2, button2)
        ];
        var card = new builder.HeroCard()
            .text(text)
            .buttons(buttons);
        return new builder.Message().addAttachment(card);
        return null;
    }
)
*/

// Initialize bot
const bot = new BB.Bot(connector)
   .use(Blis.recognizer)
   .use(Blis.templateManager)
    .onReceive(context => {
        if (context.request.type === "message" && context.topIntent) {
            context.replyWith(context.topIntent.name, context.topIntent);
        }
    })