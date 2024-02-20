import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
const openai = new OpenAI({
  baseURL: 'https://textai.buzz/v1/',
  apiKey: '',
});

// Example dummy function hard coded to return the same weather
// In production, this could be your backend API or an external API
function getCurrentWeather(location) {
  if (location.toLowerCase().includes('tokyo')) {
    return JSON.stringify({
      location: 'Tokyo',
      temperature: '10',
      unit: 'celsius',
    });
  } else if (location.toLowerCase().includes('san francisco')) {
    return JSON.stringify({
      location: 'San Francisco',
      temperature: '72',
      unit: 'fahrenheit',
    });
  } else if (location.toLowerCase().includes('paris')) {
    return JSON.stringify({
      location: 'Paris',
      temperature: '22',
      unit: 'fahrenheit',
    });
  } else {
    return JSON.stringify({ location, temperature: 'unknown' });
  }
}

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  async runConversation(content: string) {
    // Step 1: send the conversation and available functions to the model
    const messages: Array<ChatCompletionMessageParam> = [
      {
        role: 'system',
        content: `Assume that you are now a chrome browser plug-in and you have permission to call chrome-related APIs. Users will input requirements through natural language, and if you can achieve it through the given API call, you will reply to the call instructions. For example, if the user inputs: "Add the current page to the study directory in bookmarks", you need to complete it in two steps. The first step is to call chrome.bookmarks.search and pass in the parameters "study" and "(r) => r.length ? r[0].id : null "to get the id corresponding to the directory "study", and then add the current page to the "study" directory through the create method
        you can get current tab url by pass in CURRENT_TAB_URL variable as parameter.
        you can get current tab title by pass in CURRENT_TAB_TITLE variable as parameter.`,
      },
      {
        role: 'user',
        content: content,
      },
    ];
    const tools: ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'chrome_tabs',
          description: `Use the chrome.tabs API to interact with the browser's tab system. You can use this API to create, modify, and rearrange tabs in the browser.
          The Tabs API not only offers features for manipulating and managing tabs, but can also detect the language of the tab, take a screenshot, and communicate with a tab's content scripts.`,
          parameters: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                description: 'chorme.tabs method name',
                enum: [
                  'create',
                  'discard',
                  'duplicate',
                  'get',
                  'getCurrent',
                  'goBack',
                  'goForward',
                  'group',
                  'reload',
                  'query',
                  'remove',
                  'ungroup',
                  'update'
                ],
              },
            },
            param1: {
              description:
                'param1 is the first parameter of the method, it can be string or object. according to the method you choose',
            },
            param2: {
              description:
                'param2 is the second parameter of the method, it can be string or object or function. according to the method you choose',
            },
            required: ['method'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'chrome_bookmarks',
          description: `Use the chrome.bookmarks API to create, organize, and otherwise manipulate bookmarks. Also see Override Pages, which you can use to create a custom Bookmark Manager page..
            `,
          parameters: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                description: 'chorme bookmarks method name',
                enum: [
                  'create',
                  'get',
                  'getChildren',
                  'getRecent',
                  'getSubTree',
                  'getTree',
                  'move',
                  'remove',
                  'removeTree',
                  'search',
                  'update',
                ],
              },
              param1: {
                description:
                  'param1 is the first parameter of the method, it can be string or object. according to the method you choose',
              },
              param2: {
                description:
                  'param2 is the second parameter of the method, it can be string or object or function. according to the method you choose',
              },
            },
            required: ['method'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'chrome_tabGroups',
          description: `Use the chrome.tabGroups API to interact with the browser's tab grouping system. You can use this API to modify and rearrange tab groups in the browser. To group and ungroup tabs, or to query what tabs are in groups, use the chrome.tabs API.`,
          parameters: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                description: 'chorme.tabGroups method name',
                enum: [
                  'get',
                  'move',
                  'query',
                  'update',
                ],
              },
              param1: {
                description:
                  'param1 is the first parameter of the method, it can be string or object. according to the method you choose',
              },
              param2: {
                description:
                  'param2 is the second parameter of the method, it can be string or object or function. according to the method you choose',
              },
            },
            required: ['method'],
          },
        }
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-1106',
      messages: messages,
      tools: tools,
      tool_choice: 'auto', // auto is default, but we'll be explicit
    });
    const responseMessage = response.choices[0].message;

    // Step 2: check if the model wanted to call a function
    const toolCalls = responseMessage.tool_calls;
    if (responseMessage.tool_calls) {
      // Step 3: call the function
      // Note: the JSON response may not always be valid; be sure to handle errors
      const availableFunctions = {
        chrome_tabs: (...args: any) => {
          console.log('chrome.tabs', args);
          return JSON.stringify('chrome.tabs.create done');
        },
        chrome_tabGroups: (...args: any) => {
          console.log('chrome.tabGroups', args);
          return JSON.stringify('chrome.tabGroups.create done');
        },
        chrome_bookmarks: (...args: any) => {
          console.log('chrome.bookmarks', args);
          return JSON.stringify('chrome.bookmarks.create done');
        },
      }; // only one function in this example, but you can have multiple
      messages.push(responseMessage as any); // extend conversation with assistant's reply
      toolCalls.forEach((toolCall, i) => {
        console.log(`call${i}: `, toolCall);

        const functionName = toolCall.function.name;
        const functionToCall = availableFunctions[functionName];
        const functionArgs = JSON.parse(toolCall.function.arguments);
        // console.log(functionArgs);

        const functionResponse = functionToCall(
          functionArgs.location,
          functionArgs.unit,
        );
        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          // name: functionName,
          content: functionResponse,
        }); // extend conversation with function response
      });

      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: messages,
      });
      // get a new response from the model where it can see the function response
      return secondResponse.choices;
    }
  }
}
