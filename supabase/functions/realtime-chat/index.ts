import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Upgrade': 'websocket',
  'Connection': 'Upgrade',
};

serve(async (req) => {
  console.log('Realtime chat function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    return new Response('OpenAI API key not configured', { status: 500 });
  }

  // Check if this is a WebSocket upgrade request
  const upgrade = req.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 });
  }

  try {
    console.log('Upgrading to WebSocket...');
    const { socket, response } = Deno.upgradeWebSocket(req);
    let openAISocket: WebSocket | null = null;

    socket.onopen = async () => {
      console.log('Client WebSocket connected');
      
      try {
        // Connect to OpenAI Realtime API
        console.log('Connecting to OpenAI Realtime API...');
        openAISocket = new WebSocket(
          `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`,
          {
            headers: {
              'Authorization': `Bearer ${openAIApiKey}`,
              'OpenAI-Beta': 'realtime=v1'
            }
          }
        );

        let sessionCreated = false;

        openAISocket.onopen = () => {
          console.log('Connected to OpenAI Realtime API');
        };

        openAISocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('OpenAI message type:', data.type);

            // Send session update after receiving session.created
            if (data.type === 'session.created' && !sessionCreated) {
              sessionCreated = true;
              console.log('Sending session update...');
              
              const sessionUpdate = {
                type: 'session.update',
                session: {
                  modalities: ['text', 'audio'],
                  instructions: `You are a helpful restaurant discovery assistant. You help users find restaurants, answer questions about dining, and provide recommendations. When users ask about restaurants, use the search_restaurants function to help them find what they're looking for. Be friendly, knowledgeable about food and dining, and always eager to help users discover great places to eat.`,
                  voice: 'alloy',
                  input_audio_format: 'pcm16',
                  output_audio_format: 'pcm16',
                  input_audio_transcription: {
                    model: 'whisper-1'
                  },
                  turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 1000
                  },
                  tools: [
                    {
                      type: 'function',
                      name: 'search_restaurants',
                      description: 'Search for restaurants based on user criteria like location, cuisine, price range, etc.',
                      parameters: {
                        type: 'object',
                        properties: {
                          query: { type: 'string', description: 'Search query for restaurants' },
                          location: { type: 'string', description: 'Location to search in' },
                          cuisine: { type: 'string', description: 'Type of cuisine' },
                          price_range: { type: 'string', description: 'Price range (low, medium, high)' }
                        },
                        required: ['query']
                      }
                    },
                    {
                      type: 'function',
                      name: 'get_restaurant_info',
                      description: 'Get detailed real-time information about a specific restaurant',
                      parameters: {
                        type: 'object',
                        properties: {
                          restaurant_name: { type: 'string', description: 'Name of the restaurant' },
                          location: { type: 'string', description: 'Restaurant location' }
                        },
                        required: ['restaurant_name']
                      }
                    }
                  ],
                  tool_choice: 'auto',
                  temperature: 0.8,
                  max_response_output_tokens: 'inf'
                }
              };
              
              openAISocket?.send(JSON.stringify(sessionUpdate));
            }

            // Handle function calls
            if (data.type === 'response.function_call_arguments.done') {
              console.log('Function call:', data.name, data.arguments);
              
              let result = '';
              try {
                const args = JSON.parse(data.arguments);
                
                if (data.name === 'search_restaurants') {
                  result = `I found some great restaurants for "${args.query}"${args.location ? ` in ${args.location}` : ''}. You can see the results on your screen and explore more options there.`;
                } else if (data.name === 'get_restaurant_info') {
                  result = `I'm getting current information about ${args.restaurant_name}. This includes hours, reviews, and availability.`;
                }
              } catch (e) {
                result = 'I can help you search for restaurants. What are you looking for?';
              }

              // Send function result back to OpenAI
              const functionResponse = {
                type: 'conversation.item.create',
                item: {
                  type: 'function_call_output',
                  call_id: data.call_id,
                  output: result
                }
              };
              openAISocket?.send(JSON.stringify(functionResponse));
              openAISocket?.send(JSON.stringify({ type: 'response.create' }));
            }

            // Forward all messages to client
            socket.send(event.data);
          } catch (error) {
            console.error('Error processing OpenAI message:', error);
          }
        };

        openAISocket.onerror = (error) => {
          console.error('OpenAI WebSocket error:', error);
          socket.send(JSON.stringify({ 
            type: 'error', 
            message: 'OpenAI connection error' 
          }));
        };

        openAISocket.onclose = () => {
          console.log('OpenAI WebSocket closed');
          socket.close();
        };

      } catch (error) {
        console.error('Error connecting to OpenAI:', error);
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to connect to OpenAI' 
        }));
        socket.close();
      }
    };

    socket.onmessage = (event) => {
      // Forward client messages to OpenAI
      if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
        console.log('Forwarding client message to OpenAI');
        openAISocket.send(event.data);
      }
    };

    socket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('Client WebSocket closed');
      if (openAISocket) {
        openAISocket.close();
      }
    };

    return response;

  } catch (error) {
    console.error('Error in realtime chat function:', error);
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
});