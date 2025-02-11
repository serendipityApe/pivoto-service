import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources';
console.log(process.env.OPENAI_KEY);

const openai = new OpenAI({
  baseURL: 'https://textai.buzz/v1/',
  apiKey: process.env.OPENAI_KEY,
});
/** prompt
 * v0
 * Assume that you are now a chrome browser plug-in and you have permission to call chrome-related APIs.
        Users will input requirements through natural language, and if you can achieve it through the given API call, you will reply to the call instructions. 
        For example, if the user inputs: "Add the current page to the study directory in bookmarks", you need to complete it in two steps.
        The first step is to call chrome.bookmarks.search and pass in the parameters "study" and "(r) => r.length ? r[0].id : null "to get the id corresponding to the directory "study",
        and then add the current page to the "study" directory through the create method.
        you can get current tab url by pass in CURRENT_TAB_URL variable as parameter.
        you can get current tab title by pass in CURRENT_TAB_TITLE variable as parameter.
 */
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
        content: `Suppose you are now a chrome browser plug-in and have permission to call the given chrome API. The user enters the requirements through natural language. If it can be implemented through the given API call, you need to reply to the call instruction. But if the user enters a very vague requirement, you must first guess the list of functions that you can implement and that the user may want. The given function lists some APIs based on the chrome extension manifestV3 api. These APIs are consistent with the official documentation of chrome for devlopers, such as function: "chrome_tabs", which represents tab-related APIs. For example, the user enters: "Create a group named test and add the current page to it." You need to analyze this requirement based on the given API. The implementation steps are chrome.tabs.query -> chrome.tabs.group -> chrome.tabGroups.update. You can set the input parameters of the chrome api through params, and the callbackParam parameter specifies the operation logic of the return value of this api (through lodash.get). Similar to lodash.get(result, callbackParam), the result can be obtained through &{args_0} when executing the next api. Therefore, the result of the use case is:
        [
    {
      type: "function",
      function: {
        name: "chrome_tabs",
        arguments:
          '{"method":"query","params":[{ "active": true, "lastFocusedWindow": true }], "callbackParam": "0.id"}'
      }
    },
    {
      type: "function",
      function: {
        name: "chrome_tabs",
        arguments: '{"method":"group","params":[{ "tabIds": ["&{args_0}"] }]}'
      }
    },
    {
      type: "function",
      function: {
        name: "chrome_tabGroups",
        arguments:
          '{"method":"update","params": ["&{args_0}",{"title": "test" }]}'
      }
    }
  ]`,
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
          description: `This function is a collection of chrome.tabs in the chrome Extension Reference API manifestV3.`,
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
                  'update',
                ],
              },
              param1: {
                description:
                  'param1 is the first parameter of the chrome extension reference API, and its type is consistent with the first parameter of the chrome api you selected.If the method is create, its type is object. If the method is discard, its type is string, which represents tabId.',
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
                enum: ['get', 'move', 'query', 'update'],
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
          name: 'vague_requirement',
          description: `
          If the user enters a very vague requirement, you first have to guess at the list of features that you can implement and that the user might want.
          `,
          parameters: {
            type: 'object',
            properties: {
              param1: {
                description:
                  'the list of features that you can implement and that the user might want',
              },
            },
            required: ['method'],
          },
        },
      },
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
        vague_requirement: (...args: any) => {
          console.log('vague_requirement', args);
          return JSON.stringify('vague_requirement done');
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
      return toolCalls;
      const secondResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo-1106',
        messages: messages,
      });
      // get a new response from the model where it can see the function response
      return secondResponse.choices;
    }
  }
}
